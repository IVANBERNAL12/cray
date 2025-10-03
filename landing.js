// landing.js - FIXED VERSION (Works without Supabase)
document.addEventListener('DOMContentLoaded', function() {
    console.log('Landing page loaded');
    
    // Initialize all UI elements immediately
    initializeNonAuthUI();
    initializeUI();
    
    // Optional: Check for Supabase authentication if available
    setTimeout(async () => {
        if (window.supabase && typeof window.supabase.auth !== 'undefined') {
            try {
                const authStatus = await checkAuth();
                if (authStatus.authenticated) {
                    console.log('User already logged in, redirecting to dashboard');
                    window.location.href = 'dashboard.html';
                }
            } catch (error) {
                console.error('Error checking authentication:', error);
            }
        } else {
            console.log('Supabase not available - authentication disabled');
        }
    }, 500);
});

// Function to initialize cursor
function initializeCursor() {
    if (window.innerWidth <= 768) return; // Skip on mobile
    
    let cursorContainer = document.querySelector('.cursor-container');
    
    if (!cursorContainer) {
        cursorContainer = document.createElement('div');
        cursorContainer.classList.add('cursor-container');
        document.body.appendChild(cursorContainer);
    }
    
    let cursor = cursorContainer.querySelector('.cursor');
    let cursorTrail = cursorContainer.querySelector('.cursor-trail');
    
    if (!cursor) {
        cursor = document.createElement('div');
        cursor.classList.add('cursor');
        cursorContainer.appendChild(cursor);
    }
    
    if (!cursorTrail) {
        cursorTrail = document.createElement('div');
        cursorTrail.classList.add('cursor-trail');
        cursorContainer.appendChild(cursorTrail);
    }
    
    let mouseX = 0, mouseY = 0;
    let lastX = 0, lastY = 0;
    let velocityX = 0;
    let velocityY = 0;
    let trailTimer = null;
    
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        
        velocityX = mouseX - lastX;
        velocityY = mouseY - lastY;
        
        cursor.style.left = `${mouseX}px`;
        cursor.style.top = `${mouseY}px`;
        
        const speed = Math.sqrt(velocityX * velocityX + velocityY * velocityY);
        
        if (speed > 2) {
            clearTimeout(trailTimer);
            trailTimer = setTimeout(() => {
                createTrailBubble(mouseX, mouseY, velocityX, velocityY);
            }, 20);
        }
        
        lastX = mouseX;
        lastY = mouseY;
    });
    
    function createTrailBubble(x, y, vx, vy) {
        const bubble = document.createElement('div');
        bubble.classList.add('bubble');
        
        const size = 5 + Math.random() * 10;
        bubble.style.width = `${size}px`;
        bubble.style.height = `${size}px`;
        
        const hue = 180 + Math.random() * 40;
        const opacity = 0.3 + Math.random() * 0.4;
        bubble.style.backgroundColor = `hsla(${hue}, 100%, 70%, ${opacity})`;
        bubble.style.boxShadow = `0 0 ${size}px hsla(${hue}, 100%, 70%, ${opacity})`;
        
        const angle = Math.atan2(vy, vx);
        const distance = 15;
        
        const bubbleX = x - Math.cos(angle) * distance;
        const bubbleY = y - Math.sin(angle) * distance;
        
        bubble.style.left = `${bubbleX}px`;
        bubble.style.top = `${bubbleY}px`;
        
        cursorTrail.appendChild(bubble);
        
        setTimeout(() => {
            if (bubble.parentNode) {
                bubble.parentNode.removeChild(bubble);
            }
        }, 1000);
        
        const bubbles = cursorTrail.querySelectorAll('.bubble');
        if (bubbles.length > 30) {
            const oldestBubble = bubbles[0];
            oldestBubble.parentNode.removeChild(oldestBubble);
        }
    }
    
    const interactiveElements = document.querySelectorAll('a, button, input, textarea, select, .team-member-front, .flip-back-btn');
    
    interactiveElements.forEach(element => {
        element.addEventListener('mouseenter', () => {
            cursor.classList.add('hover');
        });
        
        element.addEventListener('mouseleave', () => {
            cursor.classList.remove('hover');
        });
    });
    
    document.addEventListener('mouseleave', () => {
        cursor.style.opacity = '0';
        cursorTrail.style.opacity = '0';
    });
    
    document.addEventListener('mouseenter', () => {
        cursor.style.opacity = '1';
        cursorTrail.style.opacity = '1';
    });
}

function createCrawlingCrayfish() {
    const seabed = document.querySelector('.seabed');
    if (!seabed) return;
    
    const numCrawling = 5;
    
    for (let i = 0; i < numCrawling; i++) {
        const crayfish = document.createElement('div');
        crayfish.className = 'crawling-crayfish';
        crayfish.style.animationDelay = `${i * 6}s`;
        crayfish.style.bottom = `${10 + Math.random() * 30}px`;
        seabed.appendChild(crayfish);
    }
}

function createBubbles() {
    const oceanElements = document.getElementById('ocean-elements');
    if (!oceanElements) return;
    
    const numBubbles = 15;
    
    for (let i = 0; i < numBubbles; i++) {
        const bubble = document.createElement('div');
        bubble.className = 'ocean-element ocean-bubble';
        
        const size = 5 + Math.random() * 15;
        bubble.style.width = `${size}px`;
        bubble.style.height = `${size}px`;
        
        bubble.style.left = `${Math.random() * 100}%`;
        
        const duration = 10 + Math.random() * 20;
        bubble.style.animationDuration = `${duration}s`;
        
        bubble.style.animationDelay = `${Math.random() * 10}s`;
        
        oceanElements.appendChild(bubble);
    }
}

function createJellyfish() {
    const oceanElements = document.getElementById('ocean-elements');
    if (!oceanElements) return;
    
    const numJellyfish = 3;
    
    for (let i = 0; i < numJellyfish; i++) {
        const jellyfish = document.createElement('div');
        jellyfish.className = 'ocean-element ocean-jellyfish';
        
        jellyfish.style.left = `${Math.random() * 100}%`;
        
        const duration = 15 + Math.random() * 15;
        jellyfish.style.animationDuration = `${duration}s`;
        
        jellyfish.style.animationDelay = `${Math.random() * 5}s`;
        
        oceanElements.appendChild(jellyfish);
    }
}

function createBioluminescentParticles() {
    const bioluminescence = document.getElementById('bioluminescence');
    if (!bioluminescence) return;
    
    const numParticles = 30;
    
    for (let i = 0; i < numParticles; i++) {
        const particle = document.createElement('div');
        particle.className = 'bio-particle';
        
        const size = 2 + Math.random() * 6;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        
        particle.style.left = `${Math.random() * 100}%`;
        
        const duration = 10 + Math.random() * 20;
        particle.style.animationDuration = `${duration}s`;
        
        particle.style.animationDelay = `${Math.random() * 10}s`;
        
        const hue = 180 + Math.random() * 40;
        particle.style.background = `hsl(${hue}, 100%, 70%)`;
        particle.style.boxShadow = `0 0 ${size * 2}px hsl(${hue}, 100%, 70%)`;
        
        bioluminescence.appendChild(particle);
    }
}

function initializeMobileMenu() {
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', function() {
            navLinks.classList.toggle('active');
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
    
    const navItems = document.querySelectorAll('.nav-links a');
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            if (navLinks.classList.contains('active')) {
                navLinks.classList.remove('active');
                const icon = mobileMenuBtn.querySelector('i');
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });
    });
}

function initializeParallax() {
    window.addEventListener('scroll', () => {
        const scrollPosition = window.pageYOffset;
        const heroVisual = document.querySelector('.hero-visual');
        if (heroVisual) {
            heroVisual.style.transform = `translateY(${scrollPosition * 0.5}px)`;
        }
    });
}

function initializeContactForm() {
    const contactForm = document.querySelector('.contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            // Let Formspree handle the submission naturally
            showNotification('Sending', 'Please wait while we send your message...');
        });
    }
}

function initializeTeamCards() {
    const teamMemberCards = document.querySelectorAll('.team-member-card');
    
    teamMemberCards.forEach(card => {
        const front = card.querySelector('.team-member-front');
        const back = card.querySelector('.team-member-back');
        const flipBackBtn = card.querySelector('.flip-back-btn');
        
        front.addEventListener('click', function(e) {
            if (e.target.closest('.social-links')) {
                return;
            }
            card.classList.add('flipped');
        });
        
        if (flipBackBtn) {
            flipBackBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                card.classList.remove('flipped');
            });
        }
        
        document.addEventListener('click', function(e) {
            if (card.classList.contains('flipped') && !card.contains(e.target)) {
                card.classList.remove('flipped');
            }
        });
    });
}

function initializeNonAuthUI() {
    if (window.innerWidth > 768) {
        initializeCursor();
    }
    
    createCrawlingCrayfish();
    createBubbles();
    createJellyfish();
    createBioluminescentParticles();
    initializeMobileMenu();
    initializeParallax();
    initializeContactForm();
    initializeTeamCards();
}

function initializeUI() {
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
    const oceanCoreContainer = document.querySelector('.ocean-core-container');
    const accountExistsNotice = document.getElementById('accountExistsNotice');
    const switchToLogin = document.getElementById('switchToLogin');
    const passwordStrengthMeter = document.getElementById('passwordStrengthMeter');
    const signupPasswordInput = document.getElementById('signupPassword');

    let isMouseDown = false;
    let mouseX = 0;
    let mouseY = 0;
    let rotateX = 10;
    let rotateY = 0;

    if (window.innerWidth > 768 && oceanCoreContainer) {
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
            
            rotateX = Math.max(-30, Math.min(30, rotateX));
            
            oceanCoreContainer.style.transform = `rotateY(${rotateY}deg) rotateX(${rotateX}deg)`;
            
            mouseX = e.clientX;
            mouseY = e.clientY;
        });

        document.addEventListener('mouseup', () => {
            if (isMouseDown) {
                isMouseDown = false;
                setTimeout(() => {
                    oceanCoreContainer.style.animation = 'rotate 30s infinite linear';
                }, 1000);
            }
        });
    }

    function checkPasswordStrength(password) {
        let strength = 0;
        
        if (password.length >= 8) strength += 1;
        if (password.length >= 12) strength += 1;
        
        if (/[A-Z]/.test(password)) strength += 1;
        if (/[a-z]/.test(password)) strength += 1;
        if (/[0-9]/.test(password)) strength += 1;
        if (/[^A-Za-z0-9]/.test(password)) strength += 1;
        
        return strength;
    }

    if (signupPasswordInput && passwordStrengthMeter) {
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
    }

    window.showNotification = function(title, message, duration = 5000) {
        if (notificationToast) {
            const titleEl = document.getElementById('notificationTitle');
            const messageEl = document.getElementById('notificationMessage');
            if (titleEl && messageEl) {
                titleEl.textContent = title;
                messageEl.textContent = message;
                notificationToast.classList.add('show');
                
                setTimeout(() => {
                    notificationToast.classList.remove('show');
                }, duration);
            }
        }
    }

    const notificationClose = document.getElementById('notificationClose');
    if (notificationClose) {
        notificationClose.addEventListener('click', () => {
            notificationToast.classList.remove('show');
        });
    }

    function openAuthModal(tab) {
        if (authModal) {
            authModal.classList.add('active');
            resetForms();
            
            if (tab === 'signup') {
                if (signupTab && loginTab && signupForm && loginForm) {
                    signupTab.classList.add('active');
                    loginTab.classList.remove('active');
                    signupForm.classList.add('active');
                    loginForm.classList.remove('active');
                }
            } else {
                if (loginTab && signupTab && loginForm && signupForm) {
                    loginTab.classList.add('active');
                    signupTab.classList.remove('active');
                    loginForm.classList.add('active');
                    signupForm.classList.remove('active');
                }
            }
        }
    }

    function closeAuthModal() {
        if (authModal) {
            authModal.classList.remove('active');
            if (accountExistsNotice) {
                accountExistsNotice.style.display = 'none';
            }
        }
    }

    function resetForms() {
        if (loginForm) {
            loginForm.reset();
            document.querySelectorAll('#loginForm .error-message').forEach(el => {
                el.textContent = '';
                el.style.display = 'none';
            });
            document.querySelectorAll('#loginForm .form-group').forEach(el => {
                el.classList.remove('error');
            });
        }
        
        if (signupForm) {
            signupForm.reset();
            document.querySelectorAll('#signupForm .error-message').forEach(el => {
                el.textContent = '';
                el.style.display = 'none';
            });
            document.querySelectorAll('#signupForm .form-group').forEach(el => {
                el.classList.remove('error');
            });
            
            if (passwordStrengthMeter) {
                passwordStrengthMeter.className = 'password-strength-meter';
            }
        }
        
        if (accountExistsNotice) {
            accountExistsNotice.style.display = 'none';
        }
    }

    if (desktopLoginBtn) desktopLoginBtn.addEventListener('click', () => openAuthModal('login'));
    if (desktopSignupBtn) desktopSignupBtn.addEventListener('click', () => openAuthModal('signup'));
    if (mobileLoginBtn) mobileLoginBtn.addEventListener('click', () => openAuthModal('login'));
    if (mobileSignupBtn) mobileSignupBtn.addEventListener('click', () => openAuthModal('signup'));
    if (getStartedBtn) getStartedBtn.addEventListener('click', () => openAuthModal('signup'));
    if (closeModal) closeModal.addEventListener('click', closeAuthModal);

    if (switchToLogin) {
        switchToLogin.addEventListener('click', () => {
            if (loginTab) loginTab.click();
        });
    }

    if (authModal) {
        authModal.addEventListener('click', (e) => {
            if (e.target === authModal) {
                closeAuthModal();
            }
        });
    }

    if (loginTab && signupTab && loginForm && signupForm) {
        loginTab.addEventListener('click', () => {
            resetForms();
            loginTab.classList.add('active');
            signupTab.classList.remove('active');
            loginForm.classList.add('active');
            signupForm.classList.remove('active');
        });

        signupTab.addEventListener('click', () => {
            resetForms();
            signupTab.classList.add('active');
            loginTab.classList.remove('active');
            signupForm.classList.add('active');
            loginForm.classList.remove('active');
        });

        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            document.querySelectorAll('#loginForm .error-message').forEach(el => {
                el.textContent = '';
                el.style.display = 'none';
            });
            document.querySelectorAll('#loginForm .form-group').forEach(el => el.classList.remove('error'));
            
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;
            
            if (!email || !password) {
                showNotification('Error', 'Please fill in all fields');
                return;
            }
            
            showNotification('Info', 'Supabase authentication is not configured. Please add your Supabase credentials.');
        });

        signupForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            document.querySelectorAll('#signupForm .error-message').forEach(el => {
                el.textContent = '';
                el.style.display = 'none';
            });
            document.querySelectorAll('#signupForm .form-group').forEach(el => el.classList.remove('error'));
            
            const name = document.getElementById('signupName').value.trim();
            const email = document.getElementById('signupEmail').value.trim();
            const password = document.getElementById('signupPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            if (!name || !email || !password) {
                showNotification('Error', 'Please fill all fields');
                return;
            }
            
            if (password !== confirmPassword) {
                document.getElementById('confirmPasswordError').textContent = 'Passwords do not match';
                document.getElementById('confirmPasswordError').style.display = 'block';
                return;
            }
            
            showNotification('Info', 'Supabase authentication is not configured. Please add your Supabase credentials.');
        });
    }

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

    window.addEventListener('scroll', () => {
        const nav = document.querySelector('nav');
        if (nav) {
            if (window.scrollY > 100) {
                nav.style.padding = '10px 0';
                nav.style.background = 'rgba(0, 31, 63, 0.9)';
                nav.style.boxShadow = '0 5px 20px rgba(0, 0, 0, 0.3)';
            } else {
                nav.style.padding = '15px 0';
                nav.style.background = 'rgba(0, 31, 63, 0.7)';
                nav.style.boxShadow = 'none';
            }
        }
    });

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

    const footer = document.getElementById('footer');
    const allAnimatedElements = [...sections, footer];

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
}