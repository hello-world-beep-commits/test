const app_id = '0a5f1cc3';
const app_key = '43d28d497bb3fa7ec7615da367c13ae7';

function searchJobs() {
  const query = document.getElementById('searchInput').value;
  const location = document.getElementById('locationInput').value;

  const url = `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${app_id}&app_key=${app_key}&results_per_page=10&what=${encodeURIComponent(query)}&where=${encodeURIComponent(location)}`;

  fetch(url)
    .then(res => res.json())
    .then(data => {
      const resultsDiv = document.getElementById('results');
      resultsDiv.innerHTML = ''; // Clear previous

      if (!data.results.length) {
        resultsDiv.innerHTML = "<p>No jobs found.</p>";
        return;
      }

      data.results.forEach(job => {
        const div = document.createElement('div');
        div.className = 'job';
        div.innerHTML = `
          <h3>${job.title}</h3>
          <p><strong>Company:</strong> ${job.company.display_name}</p>
          <p><strong>Location:</strong> ${job.location.display_name}</p>
          <p>${job.description.substring(0, 200)}...</p>
          <a href="${job.redirect_url}" target="_blank">View Job</a>
        `;
        resultsDiv.appendChild(div);
      });
    })
    .catch(err => {
      console.error('Error fetching jobs:', err);
      document.getElementById('results').innerHTML = "<p>Error loading jobs. Check the console.</p>";
    });
}
