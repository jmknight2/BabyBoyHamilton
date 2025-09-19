document.addEventListener('DOMContentLoaded', function() {

    // --- Azure Function URLs ---
    const addCommentUrl = "https://babyboyhamilton-czacakg7d2dbebbv.eastus-01.azurewebsites.net/api/addComment";
    const getCommentsUrl = "https://babyboyhamilton-czacakg7d2dbebbv.eastus-01.azurewebsites.net/api/getComments";
    
    // --- Azure Blob Storage URL for Gallery ---
    const blobContainerUrl = "https://stbabyboyhamilton.blob.core.windows.net/images";


    // --- Countdown Timer Logic ---
    const dueDate = new Date("March 1, 2026 00:00:00");
    const countdownInterval = setInterval(function() {
        const now = new Date();
        
        if (now >= dueDate) {
            clearInterval(countdownInterval);
            const countdownSection = document.getElementById("countdown");
            if (countdownSection) {
                countdownSection.innerHTML = "<h2>The little one is here! Welcome to the world!</h2>";
            }
            return;
        }

        // Calculate months difference
        let months = (dueDate.getFullYear() - now.getFullYear()) * 12;
        months -= now.getMonth();
        months += dueDate.getMonth();
        
        let days;
        
        if (dueDate.getDate() < now.getDate()) {
            months--;
            const tempDate = new Date(now);
            tempDate.setMonth(tempDate.getMonth() + 1);
            days = Math.floor((tempDate - now) / (1000 * 60 * 60 * 24)) - (tempDate.getDate() - dueDate.getDate());
        } else {
            days = dueDate.getDate() - now.getDate();
        }

        if (months < 0) months = 0;

        const monthsEl = document.getElementById("months");
        const daysEl = document.getElementById("days");

        if (monthsEl) monthsEl.innerText = months;
        if (daysEl) daysEl.innerText = days;

    }, 1000);
    
    // --- Navigation Menu Logic ---
    const menuToggle = document.getElementById('menu-toggle');
    const dropdownMenu = document.getElementById('dropdown-menu');
    if(menuToggle && dropdownMenu) {
        menuToggle.addEventListener('click', () => {
            menuToggle.classList.toggle('active');
            dropdownMenu.classList.toggle('open');
        });
        dropdownMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                menuToggle.classList.remove('active');
                dropdownMenu.classList.remove('open');
            });
        });
        document.addEventListener('click', (event) => {
            if (!menuToggle.contains(event.target) && !dropdownMenu.contains(event.target)) {
                menuToggle.classList.remove('active');
                dropdownMenu.classList.remove('open');
            }
        });
    }

    // --- Image Modal Logic ---
    const imageModal = document.getElementById("imageModal");
    const modalImg = document.getElementById("modalImage");
    const closeModal = document.querySelector(".close-modal");
    const modalPrevBtn = document.getElementById("modal-prev");
    const modalNextBtn = document.getElementById("modal-next");
    let galleryImages = []; // This will be populated dynamically
    let currentImageIndex;

    const openImageModal = (index) => {
        currentImageIndex = index;
        modalImg.src = galleryImages[currentImageIndex].src;
        imageModal.style.display = "block";
    };
    
    const showNextImage = () => {
        if (galleryImages.length === 0) return;
        currentImageIndex = (currentImageIndex + 1) % galleryImages.length;
        modalImg.src = galleryImages[currentImageIndex].src;
    };

    const showPrevImage = () => {
        if (galleryImages.length === 0) return;
        currentImageIndex = (currentImageIndex - 1 + galleryImages.length) % galleryImages.length;
        modalImg.src = galleryImages[currentImageIndex].src;
    };
    
    if(modalNextBtn) modalNextBtn.onclick = showNextImage;
    if(modalPrevBtn) modalPrevBtn.onclick = showPrevImage;

    const hideImageModal = function() {
        if(imageModal) imageModal.style.display = "none";
    }

    if(closeModal) closeModal.onclick = hideImageModal;
    if(imageModal) imageModal.addEventListener('click', function(event) {
        if (event.target === event.currentTarget) {
            hideImageModal();
        }
    });

    // --- Gallery Carousel Logic ---
    const gallery = document.querySelector(".gallery");
    const prevBtn = document.getElementById("prev-btn");
    const nextBtn = document.getElementById("next-btn");
    const loadingGallery = document.getElementById('loading-gallery');
    let currentSlideIndex = 0;

    const showSlide = (index) => {
        if (gallery) {
            gallery.style.transform = `translateX(-${index * 100}%)`;
        }
    };

    const setupGalleryEventListeners = () => {
        galleryImages = document.querySelectorAll(".gallery img");
        galleryImages.forEach((img, index) => {
            img.onclick = () => openImageModal(index);
        });
    };

    const loadGalleryImagesFromBlob = async () => {
        const listUrl = `${blobContainerUrl}?restype=container&comp=list`;
        try {
            const response = await fetch(listUrl);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const xmlString = await response.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlString, "text/xml");
            const blobNames = Array.from(xmlDoc.getElementsByTagName("Name")).map(el => el.textContent);

            const galleryBlobNames = blobNames.filter(name => name !== 'hero_img.jpg');

            if (galleryBlobNames && galleryBlobNames.length > 0) {
                loadingGallery.style.display = 'none';
                galleryBlobNames.forEach(name => {
                    const img = document.createElement('img');
                    img.src = `${blobContainerUrl}/${name}`;
                    img.alt = "Gallery photo";
                    img.onerror = "this.onerror=null;this.src='https://placehold.co/220x220';";
                    gallery.appendChild(img);
                });
                
                setupGalleryEventListeners();
                
                if (galleryBlobNames.length > 1) {
                    prevBtn.classList.remove('hidden');
                    nextBtn.classList.remove('hidden');
                }
                
                nextBtn.onclick = () => {
                    currentSlideIndex = (currentSlideIndex + 1) % galleryBlobNames.length;
                    showSlide(currentSlideIndex);
                };

                prevBtn.onclick = () => {
                    currentSlideIndex = (currentSlideIndex - 1 + galleryBlobNames.length) % galleryBlobNames.length;
                    showSlide(currentSlideIndex);
                };

            } else {
                loadingGallery.textContent = 'No photos to show yet!';
            }
        } catch (error) {
            console.error('Error fetching gallery images from blob:', error);
            loadingGallery.textContent = 'Error: Could not load photos.';
        }
    };

    // --- Comments Logic ---
    const commentModal = document.getElementById('commentModal');
    const openCommentBtn = document.getElementById('open-comment-modal-btn');
    const closeCommentBtn = document.querySelector('.close-comment-modal');
    const commentForm = document.getElementById('comment-form');
    const messageInput = document.getElementById('message');
    const charCount = document.getElementById('char-count');
    const commentFeed = document.getElementById('comment-feed');
    const loadingComments = document.getElementById('loading-comments');

    const hideCommentModal = () => {
        if(commentModal) commentModal.style.display = "none";
    }
    
    if (openCommentBtn) {
        openCommentBtn.onclick = () => {
            if(commentModal) commentModal.style.display = "block";
        };
    }
    if (closeCommentBtn) closeCommentBtn.onclick = hideCommentModal;
    if (commentModal) {
        commentModal.addEventListener('click', function(event) {
            if (event.target === event.currentTarget) {
                hideCommentModal();
            }
        });
    }

    if (messageInput) {
        messageInput.addEventListener('input', () => {
            const remaining = 256 - messageInput.value.length;
            charCount.textContent = `${remaining} characters remaining`;
        });
    }

    if (commentForm) {
        commentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('name').value;
            const message = messageInput.value;
            const submitButton = commentForm.querySelector('button');

            submitButton.disabled = true;
            submitButton.textContent = 'Posting...';

            try {
                const response = await fetch(addCommentUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, message })
                });

                if (response.ok) {
                    commentForm.reset();
                    charCount.textContent = '256 characters remaining';
                    addCommentToFeed({ Name: name, Message: message, Timestamp: new Date().toISOString() }, true);
                    hideCommentModal();
                } else {
                    const errorData = await response.json();
                    alert(`Error: ${errorData.message || 'There was an error posting your comment.'}`);
                }
            } catch (error) {
                console.error('Error submitting comment:', error);
                alert('Could not connect to the server. This is likely a CORS issue.');
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Post Message';
            }
        });
    }

    const formatCommentDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    };

    const addCommentToFeed = (comment, isNew = false) => {
        if (loadingComments) {
            loadingComments.style.display = 'none';
        }
        
        const commentElement = document.createElement('div');
        commentElement.className = 'comment';
        commentElement.innerHTML = `
            <p>
                <span class="comment-author">${comment.name}</span>
                <span class="comment-date">${formatCommentDate(comment.timestamp)}</span>
            </p>
            <p class="comment-message">${comment.message}</p>
        `;

        if (isNew) {
            commentFeed.prepend(commentElement);
        } else {
            commentFeed.appendChild(commentElement);
        }
    };

    const loadComments = async () => {
        try {
            const response = await fetch(getCommentsUrl);
            if (!response.ok) {
                 throw new Error(`HTTP error! status: ${response.status}`);
            } else {
                const comments = await response.json();
                
                if (comments.length > 0) {
                    comments.forEach(comment => addCommentToFeed(comment));
                } else {
                    loadingComments.textContent = 'Be the first to leave a message!';
                }
            }
        } catch (error) {
            console.error('Error fetching comments:', error);
            loadingComments.textContent = 'Error: Could not load messages. Likely a CORS issue.';
        }
    };

    // --- Initial Page Load ---
    loadGalleryImagesFromBlob();
    loadComments();

});
