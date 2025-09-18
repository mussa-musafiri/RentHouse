    const users = JSON.parse(localStorage.getItem('users')) || [];
    let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;

    const registerBtn = document.getElementById('registerBtn');
    const loginBtn = document.getElementById('loginBtn');
    const userProfile = document.getElementById('userProfile');

    const showProfile = () => {
      if (currentUser) {
        userProfile.innerHTML = `👋 Welcome, <b>${currentUser.username}</b>`;
      } else {
        userProfile.innerHTML = '';
      }
    };

    // REGISTER
    registerBtn.addEventListener('click', () => {
      const username = document.getElementById('regUsername').value.trim();
      const phone = document.getElementById('regPhone').value.trim();
      const password = document.getElementById('regPassword').value;
      const confirm = document.getElementById('regConfirm').value;

      if (!username || !phone || !password || !confirm) {
        alert('Please fill all fields!');
        return;
      }

      if (password !== confirm) {
        alert('Passwords do not match!');
        return;
      }

      if (users.find(u => u.username === username)) {
        alert('Username already exists!');
        return;
      }

      const newUser = { username, phone, password };
      users.push(newUser);
      localStorage.setItem('users', JSON.stringify(users));
      alert('Registered successfully! Please log in.');
      document.querySelector('.signup').style.display = 'none';
      document.querySelector('.signin').style.display = 'block';
    });

    // LOGIN
    loginBtn.addEventListener('click', () => {
      const username = document.getElementById('loginUsername').value.trim();
      const password = document.getElementById('loginPassword').value;

      const user = users.find(u => u.username === username && u.password === password);
      if (user) {
        currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
        alert('Login successful!');
        showProfile();
      } else {
        alert('Invalid credentials!');
      }
    });

    // Form Toggle
    document.querySelector('.login').addEventListener('click', () => {
      document.getElementById('registerForm').style.display = 'none';
      document.getElementById('loginForm').style.display = 'block';
    });
    document.querySelector('.create').addEventListener('click', () => {
      document.getElementById('loginForm').style.display = 'none';
      document.getElementById('registerForm').style.display = 'block';
    });

    // Show if already logged in
    showProfile();
    function showSection(sectionId) {
      const sections = document.querySelectorAll('.content-section');
      sections.forEach(section => {
        section.classList.remove('active');
      });
      
      const selectedSection = document.getElementById(sectionId);
      selectedSection.classList.add('active');
    }
    
    

    function renderProperties(list) {
        property-container.innerHTML == '';
        list.forEach(p => {
          const user = users.find(u => u.phone === p.phone);
          const card = document.createElement('div');
          card.className = 'property';
          card.innerHTML = `
            <img src="${p.image}" alt="${p.title}">
            <div class="property-content">
              <h3>${p.title}</h3>
              <p><strong>Location:</strong> ${p.location}</p>
              <p><strong>Price:</strong> ${p.price} RWF</p>
              <p>${p.description}</p>
              <p><strong>Owner:</strong> ${p.owner} <a href="tel:${p.phone}" style="color:green;"><i class="fas fa-phone"></i> ${p.phone}</a></p>
              <p><strong>User:</strong> ${user ? user.name : 'Unknown'} (${user ? user.phone : 'Unknown'})</p>
            </div>
          `;
          property-container.appendChild(card);
        });
      }

      locationFilter.addEventListener('change', () => {
        const value = locationFilter.value;
        if (value === 'all') {
          renderProperties(properties);
        } else {
          const filtered = properties.filter(p => p.location.toLowerCase() === value.toLowerCase());
          renderProperties(filtered);
        }
      });

      renderProperties(properties);

      
// loading page Desgin

function renderProperties(properties) {
  const container = document.getElementById('propertyList');
  container.innerHTML = '';

  properties.forEach(property => {
    const div = document.createElement('div');
    div.className = 'property-card';
    div.innerHTML = `
      <h3>${property.title}</h3>
      <img src="${property.image}" width="200" height="150">
      <p><strong>Location:</strong> ${property.location}</p>
      <p><strong>Price:</strong> RWF ${property.price}</p>
      <p><strong>Description:</strong> ${property.description}</p>
      <p><strong>Owner:</strong> ${property.owner}</p>
      <p><strong>Phone:</strong> ${property.phone}</p>
      <a class="btn" href="tel:${property.phone}">Call Now</a>
      <button onclick="selectProperty(${property.id})">Select House</button>
    `;
    container.appendChild(div);
  });
}
