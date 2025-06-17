const app_id = '0a5f1cc3';
const app_key = '43d28d497bb3fa7ec7615da367c13ae7';

let autocomplete;

function initAutocomplete() {
  const input = document.getElementById('locationInput');
  autocomplete = new google.maps.places.Autocomplete(input, {
    types: ['(cities)'],
    // componentRestrictions: { country: "us" }, // Optional
  });

  autocomplete.addListener('place_changed', () => {
    const place = autocomplete.getPlace();
    if (!place.geometry) {
      input.value = '';
      alert('Please select a valid city from the dropdown.');
    }
  });
}

function validateCity() {
  const place = autocomplete.getPlace();
  if (!place || !place.geometry) {
    alert('Please select a valid city from the dropdown.');
    return false;
  }
  return true;
}

function searchJobs() {
  if (!validateCity()) return;

  const query = document.getElementById('searchInput').value;
  const location = document.getElementById('locationInput').value;
  const jobType = document.getElementById('jobType').value;
  const distance = document.getElementById('distance').value;
  const daysOld = document.getElementById('datePosted').value;
  const minSalary = document.getElementById('minSalary').value;
  const remoteOnly = document.getElementById('remoteOnly').checked;

  let apiUrl = `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${app_id}&app_key=${app_key}&results_per_page=10&what=${encodeURIComponent(query)}&where=${encodeURIComponent(location)}`;

  if (jobType === 'full_time') apiUrl += '&full_time=1';
  if (jobType === 'part_time') apiUrl += '&part_time=1';
  if (jobType === 'contract') apiUrl += '&contract=1';
  if (distance) apiUrl += `&distance=${distance}`;
  if (daysOld) apiUrl += `&max_days_old=${daysOld}`;
  if (minSalary) apiUrl += `&salary_min=${minSalary}`;

  fetch(apiUrl)
    .then((res) => res.json())
    .then((data) => {
      const resultsDiv = document.getElementById('results');
      resultsDiv.innerHTML = '';

      if (!data.results || data.results.length === 0) {
        resultsDiv.innerHTML = '<p>No jobs found.</p>';
        return;
      }

      data.results.forEach((job) => {
        const isRemote =
          job.description.toLowerCase().includes('remote') ||
          job.title.toLowerCase().includes('remote');
        if (remoteOnly && !isRemote) return;

        const div = document.createElement('div');
        div.className = 'job';
        div.innerHTML = `
          <h3>${job.title}</h3>
          <p><strong>Company:</strong> ${job.company.display_name}</p>
          <p><strong>Location:</strong> ${job.location.display_name}</p>
          <p>${job.description.substring(0, 200)}...</p>
          <a href="${job.redirect_url}" target="_blank" rel="noopener noreferrer">View Job</a>
        `;
        resultsDiv.appendChild(div);
      });
    })
    .catch((err) => {
      console.error('Error:', err);
      document.getElementById('results').innerHTML =
        '<p>Error loading jobs. Please try again.</p>';
    });
}
