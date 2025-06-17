const geoUsername = 'geome12';
const app_id = '0a5f1cc3';
const app_key = '43d28d497bb3fa7ec7615da367c13ae7';

const locationInput = document.getElementById('locationInput');
const searchInput = document.getElementById('searchInput');
const resultsDiv = document.getElementById('results');
const savedJobsModal = document.getElementById('savedJobsModal');
const savedJobsList = document.getElementById('savedJobsList');
const showSavedJobsBtn = document.getElementById('showSavedJobsBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const searchBtn = document.getElementById('searchBtn');
const previousSearchesDiv = document.getElementById('previousSearches');

let selectedCity = { lat: null, lng: null };

// --- Debounce ---
function debounce(func, wait = 300) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// --- Autocomplete ---
const autocompleteListId = 'autocomplete-list';

function closeAutocomplete() {
  const oldList = document.getElementById(autocompleteListId);
  if (oldList) oldList.parentNode.removeChild(oldList);
}

async function getCitySuggestions(query) {
  if (query.length < 3) return [];
  const url = `https://secure.geonames.org/searchJSON?name_startsWith=${encodeURIComponent(query)}&maxRows=5&username=${geoUsername}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    return data.geonames || [];
  } catch (err) {
    console.error('GeoNames error:', err);
    return [];
  }
}

const showAutocomplete = debounce(async function () {
  const query = locationInput.value.trim();
  selectedCity = { lat: null, lng: null };
  closeAutocomplete();

  if (query.length < 3) return;

  const results = await getCitySuggestions(query);
  if (!results.length) return;

  const container = document.createElement('div');
  container.id = autocompleteListId;
  container.style.border = '1px solid #ccc';
  container.style.position = 'absolute';
  container.style.backgroundColor = '#fff';
  container.style.zIndex = '1000';
  container.style.width = locationInput.offsetWidth + 'px';
  container.style.maxHeight = '150px';
  container.style.overflowY = 'auto';

  results.forEach(item => {
    const div = document.createElement('div');
    div.style.padding = '8px';
    div.style.cursor = 'pointer';
    div.textContent = `${item.name}, ${item.countryName}`;
    div.addEventListener('click', () => {
      locationInput.value = `${item.name}, ${item.countryName}`;
      selectedCity = { lat: item.lat, lng: item.lng };
      closeAutocomplete();
    });
    container.appendChild(div);
  });

  locationInput.parentNode.appendChild(container);
}, 300);

locationInput.addEventListener('input', showAutocomplete);
document.addEventListener('click', e => {
  if (e.target !== locationInput) closeAutocomplete();
});

// --- Local Storage for Recent Searches ---
function saveSearchTerm(term) {
  if (!term) return;
  let searches = JSON.parse(localStorage.getItem('recentSearches')) || [];
  term = term.trim().toLowerCase();
  if (!searches.includes(term)) {
    searches.unshift(term);
    if (searches.length > 5) searches.pop();
  }
  localStorage.setItem('recentSearches', JSON.stringify(searches));
  renderPreviousSearches();
}

function getSavedSearchTerms() {
  return JSON.parse(localStorage.getItem('recentSearches')) || [];
}

function renderPreviousSearches() {
  const searches = getSavedSearchTerms();
  previousSearchesDiv.innerHTML = '';
  if (!searches.length) return;
  previousSearchesDiv.innerHTML = '<strong>Previous searches:</strong> ';
  searches.forEach(term => {
    const span = document.createElement('span');
    span.textContent = term;
    span.addEventListener('click', () => {
      searchInput.value = term;
      searchJobs();
    });
    previousSearchesDiv.appendChild(span);
  });
}

// --- Saved Jobs Management ---
function getSavedJobs() {
  return JSON.parse(localStorage.getItem('savedJobs')) || [];
}

function saveJob(job) {
  let saved = getSavedJobs();
  if (!saved.find(j => j.id === job.id)) {
    saved.push({...job, applied: false, savedAt: Date.now()});
    localStorage.setItem('savedJobs', JSON.stringify(saved));
    alert('Job saved!');
  } else {
    alert('Job already saved.');
  }
}

function toggleApplied(jobId) {
  let saved = getSavedJobs();
  saved = saved.map(j => {
    if (j.id === jobId) j.applied = !j.applied;
    return j;
  });
  localStorage.setItem('savedJobs', JSON.stringify(saved));
  renderSavedJobs();
}

function removeJob(jobId) {
  let saved = getSavedJobs();
  saved = saved.filter(j => j.id !== jobId);
  localStorage.setItem('savedJobs', JSON.stringify(saved));
  renderSavedJobs();
}

function renderSavedJobs() {
  const saved = getSavedJobs();
  savedJobsList.innerHTML = '';
  if (saved.length === 0) {
    savedJobsList.innerHTML = '<p>No saved jobs.</p>';
    return;
  }

  saved.forEach(job => {
    const jobDiv = document.createElement('div');
    jobDiv.className = 'job';
    if (isExpired(job.created)) jobDiv.classList.add('expired');

    jobDiv.innerHTML = `
      <h3>${job.title}</h3>
      <p><strong>Company:</strong> ${job.company}</p>
      <p><strong>Location:</strong> ${job.location}</p>
      <p>${job.description ? job.description.substring(0, 150) : ''}...</p>
      <p class="job-source">Source: ${job.source || 'Unknown'}</p>
      <p><a href="${job.url}" target="_blank" rel="noopener noreferrer">View Job</a></p>
      <div class="job-actions">
        <label><input type="checkbox" ${job.applied ? 'checked' : ''} data-id="${job.id}" class="applied-checkbox" /> Applied</label>
        <button data-id="${job.id}" class="remove-job-btn">Remove</button>
      </div>
    `;
    savedJobsList.appendChild(jobDiv);
  });

  // Attach events for checkboxes and remove buttons
  document.querySelectorAll('.applied-checkbox').forEach(cb => {
    cb.addEventListener('change', e => {
      toggleApplied(e.target.dataset.id);
    });
  });

  document.querySelectorAll('.remove-job-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      removeJob(e.target.dataset.id);
    });
  });
}

// --- Utility to check expiration ---
function isExpired(createdStr) {
  if (!createdStr) return false;
  const createdDate = new Date(createdStr);
  const now = new Date();
  const diffDays = (now - createdDate) / (1000 * 3600 * 24);
  // Let's say jobs older than 30 days are expired
  return diffDays > 30;
}

// --- Job Search ---
async function searchJobs() {
  const query = searchInput.value.trim();
  if (!query) {
    alert('Please enter job keywords');
    return;
  }

  saveSearchTerm(query);

  const locationVal = locationInput.value.trim();
  const jobType = document.getElementById('jobType').value;
  const distance = document.getElementById('distance').value;
  const daysOld = document.getElementById('datePosted').value;
  const minSalary = document.getElementById('minSalary').value;
  const remoteOnly = document.getElementById('remoteOnly').checked;

  resultsDiv.innerHTML = 'Loading jobs...';

  let apiUrl = `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${app_id}&app_key=${app_key}&results_per_page=15&what=${encodeURIComponent(query)}`;

  if (selectedCity.lat && selectedCity.lng) {
    apiUrl += `&lat=${selectedCity.lat}&lng=${selectedCity.lng}`;
    if (distance) apiUrl += `&distance=${distance}`;
  } else if (locationVal) {
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
      const isRemote = (job.description && job.description.toLowerCase().includes('remote')) ||
                       (job.title && job.title.toLowerCase().includes('remote'));

      if (remoteOnly && !isRemote) return;

      const jobDiv = document.createElement('div');
      jobDiv.className = 'job';
      if (isExpired(job.created)) jobDiv.classList.add('expired');

      const jobId = job.id || job.redirect_url || (job.title + job.company.display_name + job.location.display_name);

      jobDiv.innerHTML = `
        <h3>${job.title}</h3>
        <p><strong>Company:</strong> ${job.company.display_name}</p>
        <p><strong>Location:</strong> ${job.location.display_name}</p>
        <p>${job.description ? job.description.substring(0, 200) : ''}...</p>
        <p class="job-source">Source: Adzuna</p>
        <a href="${job.redirect_url}" target="_blank" rel="noopener noreferrer">View Job</a>
        <div class="job-actions">
          <button data-job='${encodeURIComponent(JSON.stringify({
            id: jobId,
            title: job.title,
            company: job.company.display_name,
            location: job.location.display_name,
            description: job.description,
            source: 'Adzuna',
            url: job.redirect_url,
            created: job.created
          }))}' class="save-job-btn">Save Job</button>
        </div>
      `;
      resultsDiv.appendChild(jobDiv);
    });

    // Add listeners for save buttons
    document.querySelectorAll('.save-job-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const jobData = JSON.parse(decodeURIComponent(e.target.dataset.job));
        saveJob(jobData);
      });
    });
  } catch (err) {
    console.error('Job search error:', err);
    resultsDiv.innerHTML = '<p>Error loading jobs. Please try again.</p>';
  }
}

// --- Show saved jobs modal ---
function toggleSavedJobsModal(show) {
  if (show) {
    renderSavedJobs();
    savedJobsModal.style.display = 'block';
  } else {
    savedJobsModal.style.display = 'none';
  }
}

// --- Init ---
function init() {
  renderPreviousSearches();

  // Show last search automatically if exists
  const searches = getSavedSearchTerms();
  if (searches.length > 0) {
    searchInput.value = searches[0];
    searchJobs();
  }
}

// --- Event Listeners ---
searchBtn.addEventListener('click', searchJobs);
showSavedJobsBtn.addEventListener('click', () => toggleSavedJobsModal(true));
closeModalBtn.addEventListener('click', () => toggleSavedJobsModal(false));
window.addEventListener('click', e => {
  if (e.target === savedJobsModal) toggleSavedJobsModal(false);
});

// Start
init();
