document.addEventListener('DOMContentLoaded', function() {
	// --- CONFIGURATION ---
	const blobContainerUrl = "https://stbabyboyhamilton.blob.core.windows.net/images";
	const loginFunctionUrl = "https://babyboyhamilton-czacakg7d2dbebbv.eastus-01.azurewebsites.net/api/login";
	const uploadFunctionUrl = "https://babyboyhamilton-czacakg7d2dbebbv.eastus-01.azurewebsites.net/api/uploadGalleryImage";
	const deleteFunctionUrl = "https://babyboyhamilton-czacakg7d2dbebbv.eastus-01.azurewebsites.net/api/deleteGalleryImage";

	// DOM Elements
	const loginModal = document.getElementById('login-modal');
	const mainContent = document.getElementById('main-content');
	const loginForm = document.getElementById('login-form');
	const passwordInput = document.getElementById('password');
	const loginStatus = document.getElementById('login-status');
	const logoutBtn = document.getElementById('logout-btn');
	const fileInput = document.getElementById('fileInput');
	const uploadBtn = document.getElementById('uploadBtn');
	const gallery = document.getElementById('gallery');
	const statusDiv = document.getElementById('status');
	const previewImg = document.getElementById('preview');
	const fileNameDisplay = document.getElementById('file-name-display');
	const confirmModal = document.getElementById('confirm-modal');
	const confirmMessage = document.getElementById('confirm-message');
	const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
	const cancelDeleteBtn = document.getElementById('cancel-delete-btn');

	let selectedFileContent = null;
	let selectedFileType = null;

	// --- Cookie Helper Functions (with encoding/decoding) ---
	const setCookie = (name, value, days = 1) => {
		let expires = "";
		if (days) {
			const date = new Date();
			date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
			expires = "; expires=" + date.toUTCString();
		}
		document.cookie = name + "=" + (encodeURIComponent(value) || "") + expires + "; path=/; SameSite=Lax";
	};

	const getCookie = (name) => {
		const nameEQ = name + "=";
		const ca = document.cookie.split(';');
		for (let i = 0; i < ca.length; i++) {
			let c = ca[i];
			while (c.charAt(0) === ' ') c = c.substring(1, c.length);
			if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
		}
		return null;
	};

	const eraseCookie = (name) => {
		document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
	};

	// --- Login Logic ---
	loginForm.addEventListener('submit', async (e) => {
		e.preventDefault();
		loginStatus.textContent = "Logging in...";
		try {
			const response = await fetch(loginFunctionUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ password: passwordInput.value })
			});

			if (!response.ok) throw new Error('Invalid password.');

			const data = await response.json();
			console.log("Received from login function:", data);

			if (data && data.secretKey) {
				console.log("Attempting to set cookie with key:", data.secretKey);
				setCookie('secretKey', data.secretKey);
				console.log("document.cookie after setting:", document.cookie);
				loginModal.classList.remove('visible');
				mainContent.style.display = 'block';
				await loadGalleryImages();
			} else {
				throw new Error("Login response did not contain a secretKey.");
			}
		} catch (error) {
			loginStatus.textContent = error.message;
			console.error('Login failed:', error);
		}
	});

	// --- Logout Logic ---
	logoutBtn.addEventListener('click', () => {
		eraseCookie('secretKey');
		window.location.reload();
	});

	// --- Show image preview and update display text ---
	fileInput.addEventListener('change', (event) => {
		const file = event.target.files[0];
		if (!file) {
			selectedFileContent = null;
			selectedFileType = null;
			previewImg.style.display = 'none';
			fileNameDisplay.textContent = 'No file chosen';
			return;
		}

		fileNameDisplay.textContent = file.name;
		selectedFileType = file.name.split('.').pop().toLowerCase();

		const reader = new FileReader();
		reader.onload = (e) => {
			selectedFileContent = e.target.result.split(',')[1];
			previewImg.src = e.target.result;
			previewImg.style.display = 'block';
		};
		reader.readAsDataURL(file);
	});

	// --- Load existing images ---
	const loadGalleryImages = async () => {
		gallery.innerHTML = '<p id="loading-gallery">Loading photos...</p>';
		const listUrl = `${blobContainerUrl}?restype=container&comp=list`;
		try {
			const response = await fetch(listUrl);
			if (!response.ok) throw new Error('Failed to list blobs.');

			const xmlString = await response.text();
			const parser = new DOMParser();
			const xmlDoc = parser.parseFromString(xmlString, "text/xml");
			const blobNames = Array.from(xmlDoc.getElementsByTagName("Name"))
				.map(el => el.textContent)
				.filter(name => name.startsWith('gallery/'));

			gallery.innerHTML = '';

			blobNames.forEach(name => {
				const imgContainer = document.createElement('div');
				imgContainer.className = 'img-container';
				const img = document.createElement('img');
				img.src = `${blobContainerUrl}/${name}`;
				const deleteBtn = document.createElement('button');
				deleteBtn.textContent = 'X';
				deleteBtn.className = 'btn delete delete-btn';
				deleteBtn.onclick = () => showDeleteConfirmation(name, imgContainer);

				imgContainer.appendChild(img);
				imgContainer.appendChild(deleteBtn);
				gallery.appendChild(imgContainer);
			});
		} catch (error) {
			console.error('Error loading images:', error);
			gallery.innerHTML = '<p id="loading-gallery">Error loading photos.</p>';
		}
	};

	// --- Upload new image function ---
	uploadBtn.addEventListener('click', async () => {
		if (!selectedFileContent || !selectedFileType) {
			alert('Please select a file to upload.');
			return;
		}
		statusDiv.textContent = 'Uploading...';
		const secretKey = getCookie('secretKey');
		console.log("Using secret key for upload:", secretKey);
		try {
			const response = await fetch(uploadFunctionUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', 'x-secret-key': secretKey },
				body: JSON.stringify({ fileType: selectedFileType, content: selectedFileContent })
			});

			if (!response.ok) throw new Error(`Upload failed with status: ${response.status}`);

			statusDiv.textContent = 'Upload successful!';
			fileInput.value = '';
			previewImg.style.display = 'none';
			fileNameDisplay.textContent = 'No file chosen';
			selectedFileContent = null;
			selectedFileType = null;
			await loadGalleryImages();
		} catch (error) {
			console.error('Upload error:', error);
			statusDiv.textContent = `Upload failed: ${error.message}`;
		}
	});

	// --- Delete image logic with confirmation modal ---
	const showDeleteConfirmation = (fileName, elementToRemove) => {
		confirmMessage.textContent = `Are you sure you want to delete the image "${fileName}"?`;
		confirmModal.classList.add('visible');

		const newConfirmBtn = confirmDeleteBtn.cloneNode(true);
		confirmDeleteBtn.parentNode.replaceChild(newConfirmBtn, confirmDeleteBtn);

		newConfirmBtn.addEventListener('click', () => {
			confirmModal.classList.remove('visible');
			performDelete(fileName, elementToRemove);
		});
	};

	cancelDeleteBtn.addEventListener('click', () => {
		confirmModal.classList.remove('visible');
	});

	const performDelete = async (fileName, elementToRemove) => {
		statusDiv.textContent = `Deleting ${fileName}...`;
		const secretKey = getCookie('secretKey');
		console.log("Using secret key for delete:", secretKey);
		const strippedFileName = fileName.startsWith('gallery/') ? fileName.substring('gallery/'.length) : fileName;
		try {
			const response = await fetch(deleteFunctionUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', 'x-secret-key': secretKey },
				body: JSON.stringify({ filename: strippedFileName })
			});

			if (!response.ok) throw new Error(`Delete failed with status: ${response.status}`);

			statusDiv.textContent = `Successfully deleted ${fileName}.`;
			elementToRemove.remove();
		} catch (error) {
			console.error('Delete error:', error);
			statusDiv.textContent = `Delete failed: ${error.message}`;
		}
	};

	// --- Initial Page Check ---
	const initialSecretKey = getCookie('secretKey');
	if (initialSecretKey) {
		loginModal.classList.remove('visible');
		mainContent.style.display = 'block';
		loadGalleryImages();
	} else {
		loginModal.classList.add('visible');
		mainContent.style.display = 'none';
	}
});
