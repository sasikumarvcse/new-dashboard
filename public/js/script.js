document.getElementById("uploadForm").addEventListener("submit", function (event) {
  event.preventDefault();

  const formData = new FormData(this);
  const progressDiv = document.getElementById("progress");
  const submitButton = document.getElementById("submitBtn");
  const fileInput = document.getElementById("fileInput");
  const resultsDiv = document.getElementById("results");
  const backHomeBtn = document.getElementById("backHomeBtn");

  // Show the progress indicator, hide file input, and disable the button
  progressDiv.classList.remove("hidden");
  fileInput.classList.add("hidden");
  submitButton.disabled = true;

  fetch("/upload", {
      method: "POST",
      body: formData,
  })
      .then((response) => response.json())
      .then((data) => {
          if (data.error) {
              resultsDiv.innerHTML = `<p class="error">${data.error}</p>`;
              return;
          }

          resultsDiv.innerHTML = ""; // Clear previous results

          const files = fileInput.files;
          Array.from(files).forEach((file, index) => {
              const detection = data.detections[index];
              const nutrition = data.nutrition[index].nutrition;

              // Create a card for each uploaded image and its details
              const card = document.createElement("div");
              card.className = "card";

              // Display uploaded image
              const img = document.createElement("img");
              img.src = URL.createObjectURL(file);
              img.alt = file.name;
              card.appendChild(img);

              // Display detected items
              const detectionTitle = document.createElement("h3");
              detectionTitle.textContent = `Detected Items for ${detection.filename}:`;
              card.appendChild(detectionTitle);

              const detectionText = document.createElement("p");
              detectionText.textContent = detection.detections.join(", ");
              card.appendChild(detectionText);

              // Display nutrition details in a table
              const nutritionTable = `
                  <table class="nutrition-table">
                      <tbody>
                          <tr><td>Total Calories</td><td>${nutrition.total_calories} kcal</td></tr>
                          <tr><td>Carbs</td><td>${nutrition.macros.Carbs} g</td></tr>
                          <tr><td>Protein</td><td>${nutrition.macros.Protein} g</td></tr>
                          <tr><td>Fat</td><td>${nutrition.macros.Fat} g</td></tr>
                          <tr><td>Fiber</td><td>${nutrition.macros.Fiber} g</td></tr>
                          <tr><td>Potassium</td><td>${nutrition.micros.Potassium} mg</td></tr>
                          <tr><td>Vitamin C</td><td>${nutrition.micros["Vitamin C"]} mg</td></tr>
                      </tbody>
                  </table>
              `;
              card.innerHTML += nutritionTable;

              // Add card to results
              resultsDiv.appendChild(card);
          });

          // Show total nutrition summary
          const totalNutrition = data.total_nutrition;
          const totalNutritionTable = `
              <table class="nutrition-table">
                  <tbody>
                      <tr><td>Total Calories</td><td>${totalNutrition.calories} kcal</td></tr>
                      <tr><td>Carbs</td><td>${totalNutrition.macros.Carbs} g</td></tr>
                      <tr><td>Protein</td><td>${totalNutrition.macros.Protein} g</td></tr>
                      <tr><td>Fat</td><td>${totalNutrition.macros.Fat} g</td></tr>
                      <tr><td>Fiber</td><td>${totalNutrition.macros.Fiber} g</td></tr>
                      <tr><td>Potassium</td><td>${totalNutrition.micros.Potassium} mg</td></tr>
                      <tr><td>Vitamin C</td><td>${totalNutrition.micros["Vitamin C"]} mg</td></tr>
                  </tbody>
              </table>
          `;
          const totalNutritionCard = document.createElement("div");
          totalNutritionCard.className = "card";
          totalNutritionCard.innerHTML = `
              <h3>Total Nutrition Summary for All Images:</h3>
              ${totalNutritionTable}
          `;
          resultsDiv.appendChild(totalNutritionCard);

          // Show the results and the Back to Home button
          resultsDiv.classList.remove("hidden");
          backHomeBtn.classList.remove("hidden");

          // Hide the progress indicator and enable the button again
          progressDiv.classList.add("hidden");
          submitButton.disabled = false;
      })
      .catch((error) => {
          console.error("Error:", error);
          progressDiv.classList.add("hidden");
          submitButton.disabled = false;
      });
});

// Live Camera Logic
document.addEventListener('DOMContentLoaded', () => {
  const liveCamera = document.getElementById('liveCamera');
  const cameraControls = document.getElementById('cameraControls');
  const captureBtn = document.getElementById('captureBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const snapshotCanvas = document.getElementById('snapshotCanvas');
  const startCameraBtn = document.getElementById('startCameraBtn');
  const capturedImageDiv = document.getElementById('capturedImage');
  const capturedImg = document.getElementById('capturedImg');
  const submitCaptureBtn = document.getElementById('submitCaptureBtn');
  const cancelCaptureBtn = document.getElementById('cancelCaptureBtn');
  let stream = null;

  // Start live camera
  startCameraBtn.addEventListener('click', async () => {
      try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
          liveCamera.srcObject = stream;
          liveCamera.classList.remove('hidden');
          cameraControls.classList.remove('hidden');
          startCameraBtn.classList.add('hidden'); // Hide the start button
      } catch (error) {
          alert('Unable to access the camera. Please check your permissions.');
      }
  });

  // Stop live camera
  cancelBtn.addEventListener('click', () => {
      if (stream) {
          stream.getTracks().forEach((track) => track.stop());
      }
      liveCamera.classList.add('hidden');
      cameraControls.classList.add('hidden');
      startCameraBtn.classList.remove('hidden'); // Show the start button
  });

  // Capture a snapshot
  captureBtn.addEventListener('click', () => {
      const ctx = snapshotCanvas.getContext('2d');
      snapshotCanvas.width = liveCamera.videoWidth;
      snapshotCanvas.height = liveCamera.videoHeight;
      ctx.drawImage(liveCamera, 0, 0);
      const imageData = snapshotCanvas.toDataURL('image/png'); // Snapshot as Base64

      // Display the captured image
      capturedImg.src = imageData;
      capturedImageDiv.classList.remove('hidden');

      // Stop the live camera
      if (stream) {
          stream.getTracks().forEach((track) => track.stop());
      }
      liveCamera.classList.add('hidden');
      cameraControls.classList.add('hidden');
  });

  // Submit captured image
  submitCaptureBtn.addEventListener('click', () => {
      const blob = dataURItoBlob(capturedImg.src);
      const file = new File([blob], 'captured-image.png', { type: 'image/png' });
      const fileInput = document.getElementById('fileInput');
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInput.files = dataTransfer.files;

      // Trigger the upload
      document.getElementById('uploadForm').dispatchEvent(new Event('submit'));
      capturedImageDiv.classList.add('hidden');
  });

  // Cancel captured image
  cancelCaptureBtn.addEventListener('click', () => {
      capturedImageDiv.classList.add('hidden');
      startCameraBtn.click(); // Restart the camera
  });
});

// Helper function to convert Base64 to Blob
function dataURItoBlob(dataURI) {
  const byteString = atob(dataURI.split(',')[1]);
  const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeString });
}
function goHome() {
  // Reset all elements to their initial state
  document.getElementById("uploadForm").reset();
  document.getElementById("fileInput").classList.remove("hidden");
  document.getElementById("submitBtn").disabled = false;
  document.getElementById("results").classList.add("hidden");
  document.getElementById("backHomeBtn").classList.add("hidden");
  document.getElementById("progress").classList.add("hidden");

  // Reset camera-related elements
  const liveCamera = document.getElementById('liveCamera');
  const cameraControls = document.getElementById('cameraControls');
  const startCameraBtn = document.getElementById('startCameraBtn');
  const capturedImageDiv = document.getElementById('capturedImage');
  const stream = liveCamera.srcObject;

  if (stream) {
      stream.getTracks().forEach(track => track.stop()); // Stop the camera stream
      liveCamera.srcObject = null;
  }

  // Hide camera controls and captured image view
  liveCamera.classList.add('hidden');
  cameraControls.classList.add('hidden');
  capturedImageDiv.classList.add('hidden');

  // Show the start camera button again
  startCameraBtn.classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
  // Handle Signup Form
  const signupForm = document.getElementById('signupForm');
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      const height = parseInt(document.getElementById('height').value); // Ensure height is parsed as number
      const weight = parseInt(document.getElementById('weight').value); // Ensure weight is parsed as number
      const targetWeight = parseInt(document.getElementById('targetWeight').value); // Capture target weight
      const goal = document.querySelector('input[name="goal"]:checked')?.value;

      if (!goal) {
        alert('Please select a goal.');
        return;
      }

      try {
        const response = await fetch('/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password, height, weight, targetWeight, goal }),
        });

        const data = await response.json();
        alert(data.message);

        if (response.ok) {
          window.location.href = '/login.html';
        }
      } catch (error) {
        console.error('Error:', error);
        alert('Something went wrong. Please try again.');
      }
    });
  }

  // Handle Login Form
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;

      try {
        const response = await fetch('/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });

        const data = await response.json();

        if (response.ok) {
          alert('Login successful!');
          localStorage.setItem('username', username);
          window.location.href = '/index.html'; // Redirect to dashboard
          startAutoLogout(); // Start the auto logout timer after successful login
        } else {
          alert(data.message); // Show error message
        }
      } catch (error) {
        console.error('Error:', error);
        alert('Something went wrong. Please try again.');
      }
    });
  }

  // Function to start the auto logout after 1 hour
  function startAutoLogout() {
    setTimeout(() => {
      alert('You have been logged out due to inactivity.');
      localStorage.removeItem('username'); // Remove username from localStorage
      window.location.href = '/login.html'; // Redirect to login page
    }, 3600000); // 3600000ms = 1 hour
  }

  // Handle Logout Button
  const logoutButton = document.getElementById('logoutButton');
  if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
      try {
        const response = await fetch('/logout', {
          method: 'POST',
        });

        const data = await response.json();

        if (response.ok) {
          alert(data.message); // Optionally show the logout message
          window.location.href = '/login.html'; // Redirect to login page
        } else {
          alert(data.message); // Show any error message from the server
        }
      } catch (error) {
        console.error('Error logging out:', error);
        alert('Something went wrong while logging out.');
      }
    });
  }

  // Fetch profile and history data when the page loads
  async function fetchProfileData() {
    try {
      const usernameResponse = await fetch('/get-username');
      const usernameData = await usernameResponse.json();
      if (usernameData.username) {
        document.getElementById('username').textContent = usernameData.username;
      }

      const profileResponse = await fetch('/get-profile');
      const profileData = await profileResponse.json();
      if (profileData) {
        document.getElementById('profileWeight').textContent = profileData.currentWeight || 'N/A';
        document.getElementById('profileHeight').textContent = profileData.height || 'N/A';
        document.getElementById('profileTargetWeight').textContent = profileData.targetWeight || 'N/A';
        document.getElementById('profileGoal').textContent = profileData.goal === 'gain' ? 'Gain Weight' : 'Lose Weight';
      }

      // Fetch history data
      fetchHistoryData();
    } catch (error) {
      console.error('Error fetching profile data:', error);
    }
  }

  // Fetch history data
  async function fetchHistoryData() {
    try {
      const response = await fetch('/get-history');
      const historyData = await response.json();
      const historyList = document.getElementById('historyList');

      if (historyData && historyData.length > 0) {
        historyData.forEach(entry => {
          const listItem = document.createElement('li');
          listItem.textContent = `Date: ${new Date(entry.date).toLocaleDateString()} - Weight: ${entry.weight} kg - Goal: ${entry.goal}`;
          historyList.appendChild(listItem);
        });
      }
    } catch (error) {
      console.error('Error fetching history data:', error);
    }
  }

  // Handle edit profile form submission
  document.getElementById('editProfileForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    const currentWeight = document.getElementById('currentWeight').value;
    const height = document.getElementById('height').value;
    const targetWeight = document.getElementById('targetWeight').value;
    const goal = document.getElementById('goal').value;

    try {
      const response = await fetch('/save-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ currentWeight, height, targetWeight, goal }),
      });

      const result = await response.json();
      if (result.message === 'Profile updated successfully') {
        alert('Profile updated successfully!');
        fetchProfileData();
      } else {
        alert('Error updating profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  });

  // Fetch profile data when the page loads
  fetchProfileData();
});
