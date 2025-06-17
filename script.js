document.addEventListener('DOMContentLoaded', () => {
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

  function debounce(func, wait = 300) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  const autocompleteListId = 'autocomplete-list';
  function closeAutocomplete() {
    const oldList = document.getElementById(autocompleteListId);
    if (oldList) oldList.remove();
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
    container.style.cssText = `border:1px solid #ccc;position:absolute;background:#fff;z-index:1000;width:${locationInput.offsetWidth}px;max-height:150px;overflow-y:auto`;

    results.forEach(item => {
      const div = document.createElement('div');
      div.textContent = `${item.name}, ${item.countryName}`;
      div.style.cssText = 'padding:8px;cursor:pointer;';
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
      span.style.cursor = 'pointer';
      span.style.marginRight = '10px';
      span.addEventListener('click', () => {
        searchInput.value = term;
        searchJobs();
      });
      previousSearchesDiv.appendChild(span);
    });
  }

  function getSavedJobs() {
    return JSON.parse(localStorage.getItem('savedJobs')) || [];
  }

  function saveJob(job) {
    let saved = getSavedJobs();
    if (!saved.find(j => j.id === job.id)) {
      saved.push({ ...job, applied: false, savedAt: Date.now() });
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
    savedJobsList
