const app_id = '0a5f1cc3';
const app_key = '43d28d497bb3fa7ec7615da367c13ae7';
const geoUsername = 'geome12';

// For storing selected city details from autocomplete
let selectedCity = { name: '', lat: null, lng: null };

// Utility: debounce to limit API calls while typing
function debounce(func, wait = 10000) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Autocomplete city suggestions using GeoNames API
async function getCitySuggestions(query) {
  if (query.length < 3) return [];

  const url = `https://secure.geonames.org/searchJSON?name_startsWith=${encodeURIComponent(query)}&maxRows=5&username=${geoUsername}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (!data.geonames) return [];
    return data.geonames.map(place => ({
      name: place.name,
      country: place.countryName,
      lat: place.lat,
      lng: place.lng,
    }));
  } catch (err) {
    console.error('GeoNames API error:', err);
    return [];
  }
}

// Show autocomplete dropdown for locationInput
const locationInput = document.getElementById('locationInput');
const autocompleteListId = 'autocomplete-list';

function closeAutocomplete() {
  const list = document.getElementById(autocompleteListId);
  if (list) list.parentNode.removeChild(list);
}

function createAutocompleteList(suggestions) {
  closeAutocomplete();
  if (suggestions.length === 0) return;

  const list = document.createElement('div');
  list.id = autocompleteListId;
  list.style.border = '1px solid #ccc';
  list.style.position = 'absolute';
  list.style.backgroundColor = '#fff';
  list.style.zIndex = 1000;
  list.style.maxHeight = '150px';
  list.style.overflowY = 'auto';
  list.style.width = locationInput.offsetWidth + 'px';

  suggestions.forEach(s => {
    const item = document.createElement('div');
    item.style.padding = '8px';
    item.style.cursor = 'pointer';
    item.textContent = `${s.name}, ${s.country}`;
    item.addEventListener('click', () => {
      locationInput.value = `${s.name}, ${s.country}`;
      selectedCity = { name: s.name, lat: s.lat, lng: s.lng };
      closeAutocomplete();
    });
    list.appendChild(item);
  });

  locationInput.parentNode.appendChild(list);
}

// Debounced handler for input event
locationInput.addEventListener('input', debounce(async (e) => {
  selectedCity = { name: '', lat: null, lng: null }; // reset selection on new input
  const val = e.target.value;
  if (val.length < 3) {
    closeAutocomplete();
    return;
  }
  const suggestions = await getCitySuggestions(val);
  createAutocompleteList(suggestions);
}));

// Close autocomplete when clicking outside
document.addEventListener('click', (e) => {
  if (e.target !== locationInput) closeAutocomplete();
});

// Save recent search keywords to localStorage (max 5)
function saveSearchTerm(term) {
  if (!term) return;
  let searches = JSON.parse(localStorage.getItem('recentSearches')) || [];
  term = term.trim().toLowerCase();
  if (!searches.includes(term)) {
    searches.unshift(term);
    if (searches.length > 5) searches.pop();
  }
  localStorage.setItem('recentSearches', JSON.stringify(searches));
}

// Get saved recent searches
function getSavedSearchTerms() {
  return JSON.parse(localStorage.getItem('recentSearches')) || [];
}

// Search jobs on Adzuna API with filters and location
async function searchJobs() {
  const query = document.getElementById('searchInput').value.trim();
  if (!query) {
    alert('Please enter job keywords');
    return;
  }

  saveSearchTerm(query);

  const locationVal = document.getElementById('locationInput').value.trim();
  const jobType = document.getElementById('jobType')?.value || '';
  const distance = document.getElementById('distance')?.value || '';
  const daysOld = document.getElementById('datePosted')?.value || '';
  const minSalary = document.getElementById('minSalary')?.value || '';
  const remoteOnly = document.getElementById('remoteOnly')?.checked || false;

  const resultsDiv = document.getElementById('results');
  resultsDiv.innerHTML = 'Loading jobs...';

  // Build API URL
  let apiUrl = `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${app_id}&app_key=${app_key}&results_per_page=10&what=${encodeURIComponent(query)}`;

  // If user selected city from autocomplete, use lat/lng + distance
  if (selectedCity.lat && selectedCity.lng) {
    apiUrl += `&lat=${selectedCity.lat}&lng=${selectedCity.lng}`;
    if (distance) apiUrl += `&distance=${distance}`;
  } else if (locationVal) {
    // fallback: pass location as text if no lat/lng
    apiUrl += `&where=${encodeURIComponent(locationVal)}`;
  }

  if (jobType) {
    if (jobType === 'full_time') apiUrl += '&full_time=1';
    else if (jobType === 'part_time') apiUrl += '&part_time=1';
    else if (jobType === 'contract') apiUrl += '&contract=1';
  }

  if (daysOld) apiUrl += `&max_days_old=${daysOld}`;
  if (minSalary) apiUrl += `&salary_min=${minSalary}`;

  try {
    const res = await fetch(apiUrl);
    const data = await res.json();

    if (!data.results || data.results.length === 0) {
      resultsDiv.innerHTML = '<p>No jobs found.</p>';
      return;
    }

    resultsDiv.innerHTML = '';

    data.results.forEach(job => {
      const isRemote =
        (job.description && job.description.toLowerCase().includes('remote')) ||
        (job.title && job.title.toLowerCase().includes('remote'));

      if (remoteOnly && !isRemote) return;

      const jobDiv = document.createElement('div');
      jobDiv.className = 'job';
      jobDiv.style.border = '1px solid #ccc';
      jobDiv.style.marginBottom = '10px';
      jobDiv.style.padding = '10px';
      jobDiv.innerHTML = `
        <h3>${job.title}</h3>
        <p><strong>Company:</strong> ${job.company.display_name}</p>
        <p><strong>Location:</strong> ${job.location.display_name}</p>
        <p>${job.description ? job.description.substring(0, 200) : ''}...</p>
        <a href="${job.redirect_url}" target="_blank" rel="noopener noreferrer">View Job</a>
      `;
      resultsDiv.appendChild(jobDiv);
    });
  } catch (err) {
    console.error('Job search error:', err);
    resultsDiv.innerHTML = '<p>Error loading jobs. Please try again.</p>';
  }
}

// Show recommended jobs based on saved searches
async function showRecommendedJobs() {
  const searches = getSavedSearchTerms();
  const recommendedDiv = document.getElementById('recommendedResults');
  recommendedDiv.innerHTML = '';

  if (searches.length === 0) {
    recommendedDiv.innerHTML = '<p>No recommendations yet. Start searching jobs!</p>';
    return;
  }

  recommendedDiv.innerHTML = '<p>Showing jobs based on your recent searches: ' + searches.join(', ') + '</p>';

  const topTerm = searches[0];
  let apiUrl = `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${app_id}&app_key=${app_key}&results_per_page=5&what=${encodeURIComponent(topTerm)}`;

  // Use selected city lat/lng for distance filtering if available
  if (selectedCity.lat && selectedCity.lng) {
    apiUrl += `&lat=${selectedCity.lat}&lng=${selectedCity.lng}&distance=25`; // 25 miles radius default
  }

  try {
    const res = await fetch(apiUrl);
    const data = await res.json();

    if (!data.results || data.results.length === 0) {
      recommendedDiv.innerHTML += '<p>No recommended jobs found.</p>';
      return;
    }

    data.results.forEach(job => {
      const jobDiv = document.createElement('div');
      jobDiv.className = 'job';
      jobDiv.style.border = '1px solid #ccc';
      jobDiv.style.marginBottom = '10px';
      jobDiv.style.padding = '10px';
      jobDiv.innerHTML = `
        <h3>${job.title}</h3>
        <p><strong>Company:</strong> ${job.company.display_name}</p>
        <p><strong>Location:</strong> ${job.location.display_name}</p>
        <p>${job.description ? job.description.substring(0, 150) : ''}...</p>
        <a href="${job.redirect_url}" target="_blank" rel="noopener noreferrer">View Job</a>
      `;
      recommendedDiv.appendChild(jobDiv);
    });
  } catch (err) {
    console.error('Recommended jobs error:', err);
    recommendedDiv.innerHTML += '<p>Error loading recommended jobs.</p>';
  }
}
