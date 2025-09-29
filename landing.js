document.addEventListener('DOMContentLoaded', function() {
    // Create crawling crayfish on seabed
    createCrawlingCrayfish();
    
    function createCrawlingCrayfish() {
        const seabed = document.querySelector('.seabed');
        const numCrawling = 5;
        
        for (let i = 0; i < numCrawling; i++) {
            const crayfish = document.createElement('div');
            crayfish.className = 'crawling-crayfish';
            crayfish.style.animationDelay = `${i * 6}s`;
            crayfish.style.bottom = `${10 + Math.random() * 30}px`;
            seabed.appendChild(crayfish);
        }
    }
    
    // Create bubbles
    createBubbles();
    
    function createBubbles() {
        const oceanElements = document.getElementById('ocean-elements');
        const numBubbles = 15;
        
        for (let i = 0; i < numBubbles; i++) {
            const bubble = document.createElement('div');
            bubble.className = 'ocean-element ocean-bubble';
            
            // Random size
            const size = 5 + Math.random() * 15;
            bubble.style.width = `${size}px`;
            bubble.style.height = `${size}px`;
            
            // Random position
            bubble.style.left = `${Math.random() * 100}%`;
            
            // Random animation duration
            const duration = 10 + Math.random() * 20;
            bubble.style.animationDuration = `${duration}s`;
            
            // Random delay
            bubble.style.animationDelay = `${Math.random() * 10}s`;
            
            oceanElements.appendChild(bubble);
        }
    }
    
    // Create jellyfish
    createJellyfish();
    
    function createJellyfish() {
        const oceanElements = document.getElementById('ocean-elements');
        const numJellyfish = 3;
        
        for (let i = 0; i < numJellyfish; i++) {
            const jellyfish = document.createElement('div');
            jellyfish.className = 'ocean-element ocean-jellyfish';
            
            // Random position
            jellyfish.style.left = `${Math.random() * 100}%`;
            
            // Random animation duration
            const duration = 15 + Math.random() * 15;
            jellyfish.style.animationDuration = `${duration}s`;
            
            // Random delay
            jellyfish.style.animationDelay = `${Math.random() * 5}s`;
            
            oceanElements.appendChild(jellyfish);
        }
    }
    
    // Create bioluminescent particles
    createBioluminescentParticles();
    
    function createBioluminescentParticles() {
        const bioluminescence = document.getElementById('bioluminescence');
        const numParticles = 30;
        
        for (let i = 0; i < numParticles; i++) {
            const particle = document.createElement('div');
            particle.className = 'bio-particle';
            
            // Random size
            const size = 2 + Math.random() * 6;
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            
            // Random position
            particle.style.left = `${Math.random() * 100}%`;
            
            // Random animation duration
            const duration = 10 + Math.random() * 20;
            particle.style.animationDuration = `${duration}s`;
            
            // Random delay
            particle.style.animationDelay = `${Math.random() * 10}s`;
            
            // Random color
            const hue = 180 + Math.random() * 40; // Blue to cyan range
            particle.style.background = `hsl(${hue}, 100%, 70%)`;
            particle.style.boxShadow = `0 0 ${size * 2}px hsl(${hue}, 100%, 70%)`;
            
            bioluminescence.appendChild(particle);
        }
    }
    
    // Mobile menu toggle
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', function() {
            navLinks.classList.toggle('active');
            // Change icon to close when menu is open
            const icon = mobileMenuBtn.querySelector('i');
            if (navLinks.classList.contains('active')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
            } else {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });
    }
    
    // Close mobile menu when clicking on a link
    const navItems = document.querySelectorAll('.nav-links a');
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            if (navLinks.classList.contains('active')) {
                navLinks.classList.remove('active');
                // Reset icon to bars
                const icon = mobileMenuBtn.querySelector('i');
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });
    });
    
    // Add parallax effect to hero section
    window.addEventListener('scroll', () => {
        const scrollPosition = window.pageYOffset;
        const heroVisual = document.querySelector('.hero-visual');
        if (heroVisual) {
            heroVisual.style.transform = `translateY(${scrollPosition * 0.5}px)`;
        }
    });
    
    // Only add cursor effect on non-touch devices
    if (!('ontouchstart' in window)) {
        // Add interactive cursor effect
        document.addEventListener('mousemove', (e) => {
            const cursor = document.querySelector('.cursor');
            if (!cursor) {
                const newCursor = document.createElement('div');
                newCursor.className = 'cursor';
                newCursor.style.cssText = `
                    position: fixed;
                    width: 32px;
                    height: 32px;
                    background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M10,5 C10,5 5,10 5,15 C5,20 10,25 15,25 C20,25 25,20 25,15 C25,10 20,5 15,5 C15,5 12.5,7.5 10,5 Z" fill="rgba(255,127,80,0.8)" stroke="rgba(0,0,0,0.5)" stroke-width="1"/></svg>') no-repeat;
                    pointer-events: none;
                    z-index: 9999;
                    transition: transform 0.1s ease;
                `;
                document.body.appendChild(newCursor);
            }
            
            const cursorElement = document.querySelector('.cursor');
            cursorElement.style.left = `${e.clientX - 16}px`;
            cursorElement.style.top = `${e.clientY - 16}px`;
        });
    }
    
    // Contact form submission handler with Formspree
    const contactForm = document.querySelector('.contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form values
            const name = document.getElementById('contactName').value.trim();
            const email = document.getElementById('contactEmail').value.trim();
            const message = document.getElementById('contactMessage').value.trim();
            
            // Basic validation
            if (!name || !email || !message) {
                showNotification('Error', 'Please fill in all fields');
                return;
            }
            
            // Email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showNotification('Error', 'Please enter a valid email address');
                return;
            }
            
            // Show loading notification
            showNotification('Sending', 'Please wait while we send your message...');
            
            // Submit form using Formspree
            fetch(contactForm.action, {
                method: 'POST',
                body: new FormData(contactForm),
                headers: {
                    'Accept': 'application/json'
                }
            })
            .then(response => {
                if (response.ok) {
                    showNotification('Message Sent', 'Thank you for contacting us! We\'ll get back to you soon.');
                    contactForm.reset();
                } else {
                    throw new Error('Network response was not ok');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification('Error', 'Failed to send message. Please try again later.');
            });
        });
    }
    
    // Show notification function (if not already defined in the inline script)
    function showNotification(title, message, duration = 5000) {
        // Check if notification toast exists
        let notificationToast = document.getElementById('notificationToast');
        
        // If not, create it (in case it's not in the DOM yet)
        if (!notificationToast) {
            notificationToast = document.createElement('div');
            notificationToast.className = 'notification-toast';
            notificationToast.id = 'notificationToast';
            notificationToast.setAttribute('role', 'alert');
            notificationToast.setAttribute('aria-live', 'polite');
            
            notificationToast.innerHTML = `
                <button class="notification-close" id="notificationClose" aria-label="Close notification">&times;</button>
                <div class="notification-title" id="notificationTitle">Notification</div>
                <div class="notification-message" id="notificationMessage">Message</div>
            `;
            
            document.body.appendChild(notificationToast);
            
            // Add close functionality
            document.getElementById('notificationClose').addEventListener('click', () => {
                notificationToast.classList.remove('show');
            });
        }
        
        // Set content
        document.getElementById('notificationTitle').textContent = title;
        document.getElementById('notificationMessage').textContent = message;
        
        // Show notification
        notificationToast.classList.add('show');
        
        // Auto-hide after duration
        setTimeout(() => {
            notificationToast.classList.remove('show');
        }, duration);
    }
    
    // Team member card flip functionality
    const teamMemberCards = document.querySelectorAll('.team-member-card');
    
    teamMemberCards.forEach(card => {
        const front = card.querySelector('.team-member-front');
        const back = card.querySelector('.team-member-back');
        const flipBackBtn = card.querySelector('.flip-back-btn');
        
        // Flip card when clicking on the front
        front.addEventListener('click', function(e) {
            // Prevent flipping if clicking on social links
            if (e.target.closest('.social-links')) {
                return;
            }
            card.classList.add('flipped');
        });
        
        // Flip back when clicking the back button
        if (flipBackBtn) {
            flipBackBtn.addEventListener('click', function(e) {
                e.stopPropagation(); // Prevent event bubbling
                card.classList.remove('flipped');
            });
        }
        
        // Flip back when clicking outside the card
        document.addEventListener('click', function(e) {
            if (card.classList.contains('flipped') && !card.contains(e.target)) {
                card.classList.remove('flipped');
            }
        });
    });
});

// Custom Crayfish Claw Cursor
c// Only add cursor effect on non-touch devices
if (!('ontouchstart' in window)) {
    // Add interactive cursor effect
    document.addEventListener('mousemove', (e) => {
        const cursor = document.querySelector('.cursor');
        if (!cursor) {
            const newCursor = document.createElement('div');
            newCursor.className = 'cursor';
            newCursor.style.cssText = `
                position: fixed;
                width: 32px;
                height: 32px;
                background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M10,5 C10,5 5,10 5,15 C5,20 10,25 15,25 C20,25 25,20 25,15 C25,10 20,5 15,5 C15,5 12.5,7.5 10,5 Z" fill="rgba(255,127,80,0.8)" stroke="rgba(0,0,0,0.5)" stroke-width="1"/></svg>') no-repeat;
                pointer-events: none;
                z-index: 9999;
                transition: none;
            `;
            document.body.appendChild(newCursor);
        }
        
        const cursorElement = document.querySelector('.cursor');
        cursorElement.style.left = `${e.clientX - 16}px`;
        cursorElement.style.top = `${e.clientY - 16}px`;
    });
}
// DOM Elements
const desktopLoginBtn = document.getElementById('desktopLoginBtn');
const desktopSignupBtn = document.getElementById('desktopSignupBtn');
const mobileLoginBtn = document.getElementById('mobileLoginBtn');
const mobileSignupBtn = document.getElementById('mobileSignupBtn');
const getStartedBtn = document.getElementById('getStartedBtn');
const authModal = document.getElementById('authModal');
const closeModal = document.getElementById('closeModal');
const loginTab = document.getElementById('loginTab');
const signupTab = document.getElementById('signupTab');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const notificationToast = document.getElementById('notificationToast');
const notificationTitle = document.getElementById('notificationTitle');
const notificationMessage = document.getElementById('notificationMessage');
const notificationClose = document.getElementById('notificationClose');
const oceanCoreContainer = document.querySelector('.ocean-core-container');
const accountExistsNotice = document.getElementById('accountExistsNotice');
const switchToLogin = document.getElementById('switchToLogin');

// Password strength meter
const passwordStrengthMeter = document.getElementById('passwordStrengthMeter');
const signupPasswordInput = document.getElementById('signupPassword');

// 3D Ocean Core Interaction
let isMouseDown = false;
let mouseX = 0;
let mouseY = 0;
let rotateX = 10;
let rotateY = 0;

// Only enable 3D interaction on larger screens
if (window.innerWidth > 768) {
    oceanCoreContainer.addEventListener('mousedown', (e) => {
        isMouseDown = true;
        mouseX = e.clientX;
        mouseY = e.clientY;
        oceanCoreContainer.style.animation = 'none';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isMouseDown) return;
        
        const deltaX = e.clientX - mouseX;
        const deltaY = e.clientY - mouseY;
        
        rotateY += deltaX * 0.5;
        rotateX -= deltaY * 0.5;
        
        // Limit rotation on X axis
        rotateX = Math.max(-30, Math.min(30, rotateX));
        
        oceanCoreContainer.style.transform = `rotateY(${rotateY}deg) rotateX(${rotateX}deg)`;
        
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    document.addEventListener('mouseup', () => {
        if (isMouseDown) {
            isMouseDown = false;
            // Resume animation after interaction
            setTimeout(() => {
                oceanCoreContainer.style.animation = 'rotate 30s infinite linear';
            }, 1000);
        }
    });
}

// Password strength checker
function checkPasswordStrength(password) {
    let strength = 0;
    
    // Length check
    if (password.length >= 8) strength += 1;
    if (password.length >= 12) strength += 1;
    
    // Character variety
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    
    return strength;
}

// Update password strength meter
signupPasswordInput.addEventListener('input', () => {
    const password = signupPasswordInput.value;
    const strength = checkPasswordStrength(password);
    
    passwordStrengthMeter.className = 'password-strength-meter';
    
    if (strength <= 2) {
        passwordStrengthMeter.classList.add('weak');
    } else if (strength <= 4) {
        passwordStrengthMeter.classList.add('medium');
    } else {
        passwordStrengthMeter.classList.add('strong');
    }
});

// Hash function for passwords (simplified for demo)
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
}

// Get users from localStorage
function getUsers() {
    const usersJSON = localStorage.getItem('aquavision_users');
    return usersJSON ? JSON.parse(usersJSON) : [];
}

// Save users to localStorage
function saveUsers(users) {
    localStorage.setItem('aquavision_users', JSON.stringify(users));
}

// Show notification function
function showNotification(title, message, duration = 5000) {
    notificationTitle.textContent = title;
    notificationMessage.textContent = message;
    notificationToast.classList.add('show');
    
    setTimeout(() => {
        notificationToast.classList.remove('show');
    }, duration);
}

// Close notification
notificationClose.addEventListener('click', () => {
    notificationToast.classList.remove('show');
});

// Open Modal
function openAuthModal(tab) {
    authModal.classList.add('active');
    // Reset forms and errors when opening modal
    resetForms();
    
    if (tab === 'signup') {
        signupTab.classList.add('active');
        loginTab.classList.remove('active');
        signupForm.classList.add('active');
        loginForm.classList.remove('active');
        signupTab.setAttribute('aria-selected', 'true');
        loginTab.setAttribute('aria-selected', 'false');
        signupTab.setAttribute('tabindex', '0');
        loginTab.setAttribute('tabindex', '-1');
        signupForm.setAttribute('tabindex', '0');
        loginForm.setAttribute('tabindex', '-1');
    } else {
        loginTab.classList.add('active');
        signupTab.classList.remove('active');
        loginForm.classList.add('active');
        signupForm.classList.remove('active');
        loginTab.setAttribute('aria-selected', 'true');
        signupTab.setAttribute('aria-selected', 'false');
        loginTab.setAttribute('tabindex', '0');
        signupTab.setAttribute('tabindex', '-1');
        loginForm.setAttribute('tabindex', '0');
        signupForm.setAttribute('tabindex', '-1');
    }
}

// Close Modal
function closeAuthModal() {
    authModal.classList.remove('active');
    accountExistsNotice.style.display = 'none';
}

// Reset forms and errors
function resetForms() {
    // Reset login form
    loginForm.reset();
    document.querySelectorAll('#loginForm .error-message').forEach(el => {
        el.textContent = '';
        el.style.display = 'none';
    });
    document.querySelectorAll('#loginForm .form-group').forEach(el => {
        el.classList.remove('error');
    });
    
    // Reset signup form
    signupForm.reset();
    document.querySelectorAll('#signupForm .error-message').forEach(el => {
        el.textContent = '';
        el.style.display = 'none';
    });
    document.querySelectorAll('#signupForm .form-group').forEach(el => {
        el.classList.remove('error');
    });
    
    // Reset password strength meter
    passwordStrengthMeter.className = 'password-strength-meter';
    
    // Hide account exists notice
    accountExistsNotice.style.display = 'none';
}

// Event Listeners
desktopLoginBtn.addEventListener('click', () => openAuthModal('login'));
desktopSignupBtn.addEventListener('click', () => openAuthModal('signup'));
mobileLoginBtn.addEventListener('click', () => openAuthModal('login'));
mobileSignupBtn.addEventListener('click', () => openAuthModal('signup'));
getStartedBtn.addEventListener('click', () => openAuthModal('signup'));
closeModal.addEventListener('click', closeAuthModal);

// Switch to login from account exists notice
switchToLogin.addEventListener('click', () => {
    loginTab.click();
});

// Close modal when clicking outside
authModal.addEventListener('click', (e) => {
    if (e.target === authModal) {
        closeAuthModal();
    }
});

// Tab Switching
loginTab.addEventListener('click', () => {
    resetForms();
    loginTab.classList.add('active');
    signupTab.classList.remove('active');
    loginForm.classList.add('active');
    signupForm.classList.remove('active');
    loginTab.setAttribute('aria-selected', 'true');
    signupTab.setAttribute('aria-selected', 'false');
    loginTab.setAttribute('tabindex', '0');
    signupTab.setAttribute('tabindex', '-1');
    loginForm.setAttribute('tabindex', '0');
    signupForm.setAttribute('tabindex', '-1');
});

signupTab.addEventListener('click', () => {
    resetForms();
    signupTab.classList.add('active');
    loginTab.classList.remove('active');
    signupForm.classList.add('active');
    loginForm.classList.remove('active');
    signupTab.setAttribute('aria-selected', 'true');
    loginTab.setAttribute('aria-selected', 'false');
    signupTab.setAttribute('tabindex', '0');
    loginTab.setAttribute('tabindex', '-1');
    signupForm.setAttribute('tabindex', '0');
    loginForm.setAttribute('tabindex', '-1');
});

// Keyboard navigation for tabs
loginTab.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        loginTab.click();
    } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        signupTab.focus();
    }
});

signupTab.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        signupTab.click();
    } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        loginTab.focus();
    }
});

// Login Form Submission - FIXED
loginForm.addEventListener('submit', function(e) {
    e.preventDefault(); // Prevent default form submission
    
    // Reset error messages
    document.querySelectorAll('#loginForm .error-message').forEach(el => {
        el.textContent = '';
        el.style.display = 'none';
    });
    document.querySelectorAll('#loginForm .form-group').forEach(el => el.classList.remove('error'));
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    let hasError = false;
    
    // Validate email
    if (!email) {
        document.getElementById('loginEmailError').textContent = 'Crayfish ID is required';
        document.getElementById('loginEmailError').style.display = 'block';
        document.getElementById('loginEmail').parentElement.classList.add('error');
        hasError = true;
    }
    
    // Validate password
    if (!password) {
        document.getElementById('loginPasswordError').textContent = 'Shell Code is required';
        document.getElementById('loginPasswordError').style.display = 'block';
        document.getElementById('loginPassword').parentElement.classList.add('error');
        hasError = true;
    }
    
    if (hasError) return;
    
    // Get users from localStorage
    const users = getUsers();
    
    // Find user by email
    const user = users.find(u => u.email === email);
    
    if (!user) {
        document.getElementById('loginEmailError').textContent = 'This Crayfish ID is not registered. Please sign up first.';
        document.getElementById('loginEmailError').style.display = 'block';
        document.getElementById('loginEmail').parentElement.classList.add('error');
        return;
    }
    
    // Check password
    const hashedPassword = simpleHash(password);
    if (user.password !== hashedPassword) {
        document.getElementById('loginPasswordError').textContent = 'Incorrect Shell Code. Please try again.';
        document.getElementById('loginPasswordError').style.display = 'block';
        document.getElementById('loginPassword').parentElement.classList.add('error');
        return;
    }
    
    // Set login status in localStorage
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('userEmail', email);
    localStorage.setItem('userName', user.name);
    
    // Show success notification
    showNotification('Login Successful', 'Welcome back to the colony!');
    
    // Redirect to dashboard after a short delay
    setTimeout(() => {
        window.location.href = 'dashboard.html';
    }, 1500);
});

// Sign Up Form Submission
signupForm.addEventListener('submit', function(e) {
    e.preventDefault(); // Prevent default form submission
    
    // Reset error messages
    document.querySelectorAll('#signupForm .error-message').forEach(el => {
        el.textContent = '';
        el.style.display = 'none';
    });
    document.querySelectorAll('#signupForm .form-group').forEach(el => el.classList.remove('error'));
    
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    let hasError = false;
    
    // Validate name
    if (!name || name.length < 2) {
        document.getElementById('signupNameError').textContent = 'Please enter a valid name';
        document.getElementById('signupNameError').style.display = 'block';
        document.getElementById('signupName').parentElement.classList.add('error');
        hasError = true;
    }
    
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
        document.getElementById('signupEmailError').textContent = 'Please enter a valid email address';
        document.getElementById('signupEmailError').style.display = 'block';
        document.getElementById('signupEmail').parentElement.classList.add('error');
        hasError = true;
    }
    
    // Validate password strength
    const strength = checkPasswordStrength(password);
    if (strength < 3) {
        document.getElementById('signupPasswordError').textContent = 'Shell Code is too weak. Please use a stronger password.';
        document.getElementById('signupPasswordError').style.display = 'block';
        document.getElementById('signupPassword').parentElement.classList.add('error');
        hasError = true;
    }
    
    // Validate password confirmation
    if (password !== confirmPassword) {
        document.getElementById('confirmPasswordError').textContent = 'Shell codes do not match';
        document.getElementById('confirmPasswordError').style.display = 'block';
        document.getElementById('confirmPassword').parentElement.classList.add('error');
        hasError = true;
    }
    
    if (hasError) return;
    
    // Get users from localStorage
    const users = getUsers();
    
    // Check if user already exists
    if (users.some(u => u.email === email)) {
        accountExistsNotice.style.display = 'block';
        return;
    }
    
    // Hash the password
    const hashedPassword = simpleHash(password);
    
    // Create new user
    const newUser = {
        name,
        email,
        password: hashedPassword,
        createdAt: new Date().toISOString()
    };
    
    // Add user to array
    users.push(newUser);
    
    // Save users to localStorage
    saveUsers(users);
    
    // Set login status in localStorage
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('userEmail', email);
    localStorage.setItem('userName', name);
    
    // Show success notification
    showNotification('Registration Successful', 'Welcome to the colony!');
    
    // Redirect to dashboard after a short delay
    setTimeout(() => {
        window.location.href = 'dashboard.html';
    }, 1500);
});

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Add scroll effect to navigation
window.addEventListener('scroll', () => {
    const nav = document.querySelector('nav');
    if (window.scrollY > 100) {
        nav.style.padding = '10px 0';
        nav.style.background = 'rgba(0, 31, 63, 0.9)';
        nav.style.boxShadow = '0 5px 20px rgba(0, 0, 0, 0.3)';
    } else {
        nav.style.padding = '15px 0';
        nav.style.background = 'rgba(0, 31, 63, 0.7)';
        nav.style.boxShadow = 'none';
    }
});

// Highlight active navigation link based on scroll position
const sections = document.querySelectorAll('section');
const navLinks = document.querySelectorAll('.nav-links a');

window.addEventListener('scroll', () => {
    let current = '';
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (pageYOffset >= sectionTop - 100) {
            current = section.getAttribute('id');
        }
    });
    
    navLinks.forEach(link => {
        link.classList.remove('active-link');
        if (link.getAttribute('href').slice(1) === current) {
            link.classList.add('active-link');
        }
    });
});

// Add scroll animations to sections and footer
const footer = document.getElementById('footer');
const allAnimatedElements = [...sections, footer]; // Include footer in the animation

const observerOptions = {
    root: null,
    rootMargin: "0px",
    threshold: 0.1
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
        }
    });
}, observerOptions);

allAnimatedElements.forEach(element => {
    observer.observe(element);
});
// Team member card flip functionality
document.addEventListener('DOMContentLoaded', function() {
    const teamMemberCards = document.querySelectorAll('.team-member-card');
    
    teamMemberCards.forEach(card => {
        const front = card.querySelector('.team-member-front');
        const flipBackBtn = card.querySelector('.flip-back-btn');
        
        // Flip card when clicking on the front
        front.addEventListener('click', function(e) {
            // Prevent flipping if clicking on social links
            if (e.target.closest('.social-links')) {
                return;
            }
            card.classList.add('flipped');
        });
        
        // Flip back when clicking the back button
        if (flipBackBtn) {
            flipBackBtn.addEventListener('click', function(e) {
                e.stopPropagation(); // Prevent event bubbling
                card.classList.remove('flipped');
            });
        }
        
        // Flip back when clicking outside the card
        document.addEventListener('click', function(e) {
            if (card.classList.contains('flipped') && !card.contains(e.target)) {
                card.classList.remove('flipped');
            }
        });
    });
});