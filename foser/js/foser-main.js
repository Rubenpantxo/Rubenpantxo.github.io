/**
 * FOSER Soluciones Industriales
 * JavaScript principal para interactividad
 */

document.addEventListener('DOMContentLoaded', function() {
    // =====================================================
    // PRELOADER
    // =====================================================
    const preloader = document.getElementById('preloader');

    window.addEventListener('load', function() {
        setTimeout(function() {
            preloader.classList.add('hidden');
        }, 500);
    });

    // Fallback si el load no se dispara
    setTimeout(function() {
        preloader.classList.add('hidden');
    }, 3000);

    // =====================================================
    // HEADER SCROLL EFFECT
    // =====================================================
    const header = document.getElementById('header');
    const heroSection = document.getElementById('inicio');

    function handleHeaderScroll() {
        if (window.scrollY > 100) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    }

    window.addEventListener('scroll', handleHeaderScroll);
    handleHeaderScroll();

    // =====================================================
    // MOBILE NAVIGATION
    // =====================================================
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');

    navToggle.addEventListener('click', function() {
        navToggle.classList.toggle('active');
        navMenu.classList.toggle('active');
        navToggle.setAttribute('aria-expanded',
            navToggle.classList.contains('active'));
    });

    // Cerrar menú al hacer click en un enlace
    navLinks.forEach(function(link) {
        link.addEventListener('click', function() {
            navToggle.classList.remove('active');
            navMenu.classList.remove('active');
            navToggle.setAttribute('aria-expanded', 'false');
        });
    });

    // Cerrar menú al hacer click fuera
    document.addEventListener('click', function(e) {
        if (!navToggle.contains(e.target) && !navMenu.contains(e.target)) {
            navToggle.classList.remove('active');
            navMenu.classList.remove('active');
            navToggle.setAttribute('aria-expanded', 'false');
        }
    });

    // =====================================================
    // ACTIVE NAV LINK ON SCROLL
    // =====================================================
    const sections = document.querySelectorAll('section[id]');

    function updateActiveNavLink() {
        const scrollY = window.pageYOffset;

        sections.forEach(function(section) {
            const sectionHeight = section.offsetHeight;
            const sectionTop = section.offsetTop - 150;
            const sectionId = section.getAttribute('id');
            const navLink = document.querySelector('.nav-link[href="#' + sectionId + '"]');

            if (navLink) {
                if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
                    navLinks.forEach(function(link) {
                        link.classList.remove('active');
                    });
                    navLink.classList.add('active');
                }
            }
        });
    }

    window.addEventListener('scroll', updateActiveNavLink);
    updateActiveNavLink();

    // =====================================================
    // SMOOTH SCROLL
    // =====================================================
    document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                const headerOffset = 80;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // =====================================================
    // ANIMATED COUNTERS
    // =====================================================
    const statNumbers = document.querySelectorAll('.stat-number');
    let countersAnimated = false;

    function animateCounters() {
        if (countersAnimated) return;

        statNumbers.forEach(function(stat) {
            const target = parseInt(stat.getAttribute('data-count'));
            const duration = 2000;
            const step = target / (duration / 16);
            let current = 0;

            function updateCounter() {
                current += step;
                if (current < target) {
                    stat.textContent = Math.floor(current);
                    requestAnimationFrame(updateCounter);
                } else {
                    stat.textContent = target;
                }
            }

            updateCounter();
        });

        countersAnimated = true;
    }

    // Trigger counters when hero is in view
    const heroObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                setTimeout(animateCounters, 500);
            }
        });
    }, { threshold: 0.5 });

    if (heroSection) {
        heroObserver.observe(heroSection);
    }

    // =====================================================
    // PROJECT FILTERS
    // =====================================================
    const filterButtons = document.querySelectorAll('.filter-btn');
    const projectCards = document.querySelectorAll('.proyecto-card');

    filterButtons.forEach(function(button) {
        button.addEventListener('click', function() {
            // Update active button
            filterButtons.forEach(function(btn) {
                btn.classList.remove('active');
            });
            this.classList.add('active');

            // Filter projects
            const filter = this.getAttribute('data-filter');

            projectCards.forEach(function(card) {
                const categories = card.getAttribute('data-category');

                if (filter === 'all') {
                    card.style.display = 'block';
                    setTimeout(function() {
                        card.style.opacity = '1';
                        card.style.transform = 'translateY(0)';
                    }, 50);
                } else if (categories && categories.includes(filter)) {
                    card.style.display = 'block';
                    setTimeout(function() {
                        card.style.opacity = '1';
                        card.style.transform = 'translateY(0)';
                    }, 50);
                } else {
                    card.style.opacity = '0';
                    card.style.transform = 'translateY(20px)';
                    setTimeout(function() {
                        card.style.display = 'none';
                    }, 300);
                }
            });
        });
    });

    // =====================================================
    // BACK TO TOP BUTTON
    // =====================================================
    const backToTop = document.getElementById('backToTop');

    function handleBackToTop() {
        if (window.scrollY > 500) {
            backToTop.classList.add('visible');
        } else {
            backToTop.classList.remove('visible');
        }
    }

    window.addEventListener('scroll', handleBackToTop);

    backToTop.addEventListener('click', function() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    // =====================================================
    // REVEAL ON SCROLL ANIMATION
    // =====================================================
    const revealElements = document.querySelectorAll(
        '.servicio-card, .proyecto-card, .valor-card, .mvv-card, .info-card'
    );

    const revealObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry, index) {
            if (entry.isIntersecting) {
                setTimeout(function() {
                    entry.target.classList.add('reveal', 'active');
                }, index * 100);
                revealObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    revealElements.forEach(function(element) {
        element.classList.add('reveal');
        revealObserver.observe(element);
    });

    // =====================================================
    // FORM VALIDATION & SUBMISSION
    // =====================================================
    const contactForm = document.getElementById('contactForm');

    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();

            // Get form values
            const nombre = document.getElementById('nombre').value.trim();
            const telefono = document.getElementById('telefono').value.trim();
            const email = document.getElementById('email').value.trim();
            const asunto = document.getElementById('asunto').value;
            const mensaje = document.getElementById('mensaje').value.trim();
            const privacidad = document.getElementById('privacidad').checked;

            // Validation
            let isValid = true;
            let errorMessage = '';

            if (!nombre) {
                isValid = false;
                errorMessage = 'Por favor, introduce tu nombre.';
            } else if (!telefono) {
                isValid = false;
                errorMessage = 'Por favor, introduce tu teléfono.';
            } else if (!email || !isValidEmail(email)) {
                isValid = false;
                errorMessage = 'Por favor, introduce un email válido.';
            } else if (!asunto) {
                isValid = false;
                errorMessage = 'Por favor, selecciona un asunto.';
            } else if (!mensaje) {
                isValid = false;
                errorMessage = 'Por favor, escribe tu mensaje.';
            } else if (!privacidad) {
                isValid = false;
                errorMessage = 'Debes aceptar la política de privacidad.';
            }

            if (!isValid) {
                showNotification(errorMessage, 'error');
                return;
            }

            // Simulate form submission
            const submitBtn = contactForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
            submitBtn.disabled = true;

            // Simulate API call
            setTimeout(function() {
                submitBtn.innerHTML = '<i class="fas fa-check"></i> Mensaje enviado';
                submitBtn.style.background = '#27ae60';

                showNotification(
                    '¡Gracias! Tu mensaje ha sido enviado correctamente. Te contactaremos pronto.',
                    'success'
                );

                // Reset form
                setTimeout(function() {
                    contactForm.reset();
                    submitBtn.innerHTML = originalText;
                    submitBtn.style.background = '';
                    submitBtn.disabled = false;
                }, 3000);
            }, 1500);
        });
    }

    function isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    // =====================================================
    // NOTIFICATION SYSTEM
    // =====================================================
    function showNotification(message, type) {
        // Remove existing notifications
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'notification notification-' + type;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close" aria-label="Cerrar">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Add styles
        notification.style.cssText = `
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%) translateY(100px);
            background: ${type === 'success' ? '#27ae60' : '#e74c3c'};
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.3);
            z-index: 9999;
            display: flex;
            align-items: center;
            gap: 15px;
            max-width: 90%;
            opacity: 0;
            transition: all 0.3s ease;
        `;

        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.style.cssText = `
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            padding: 5px;
            opacity: 0.8;
        `;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(function() {
            notification.style.transform = 'translateX(-50%) translateY(0)';
            notification.style.opacity = '1';
        }, 10);

        // Close button
        closeBtn.addEventListener('click', function() {
            notification.style.transform = 'translateX(-50%) translateY(100px)';
            notification.style.opacity = '0';
            setTimeout(function() {
                notification.remove();
            }, 300);
        });

        // Auto close
        setTimeout(function() {
            if (notification.parentNode) {
                notification.style.transform = 'translateX(-50%) translateY(100px)';
                notification.style.opacity = '0';
                setTimeout(function() {
                    notification.remove();
                }, 300);
            }
        }, 5000);
    }

    // =====================================================
    // PARALLAX EFFECT (subtle)
    // =====================================================
    const heroContent = document.querySelector('.hero-content');

    window.addEventListener('scroll', function() {
        if (window.innerWidth > 768) {
            const scrolled = window.pageYOffset;
            const rate = scrolled * 0.3;

            if (heroContent && scrolled < window.innerHeight) {
                heroContent.style.transform = 'translateY(' + rate + 'px)';
                heroContent.style.opacity = 1 - (scrolled / window.innerHeight);
            }
        }
    });

    // =====================================================
    // SERVICE CARD HOVER EFFECT
    // =====================================================
    const servicioCards = document.querySelectorAll('.servicio-card');

    servicioCards.forEach(function(card) {
        card.addEventListener('mouseenter', function() {
            this.style.setProperty('--hover-x', '50%');
            this.style.setProperty('--hover-y', '50%');
        });

        card.addEventListener('mousemove', function(e) {
            const rect = this.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            this.style.setProperty('--hover-x', x + '%');
            this.style.setProperty('--hover-y', y + '%');
        });
    });

    // =====================================================
    // KEYBOARD NAVIGATION
    // =====================================================
    document.addEventListener('keydown', function(e) {
        // ESC to close mobile menu
        if (e.key === 'Escape') {
            navToggle.classList.remove('active');
            navMenu.classList.remove('active');
            navToggle.setAttribute('aria-expanded', 'false');
        }
    });

    // =====================================================
    // LAZY LOADING IMAGES (if any real images are added)
    // =====================================================
    const lazyImages = document.querySelectorAll('img[data-src]');

    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.add('loaded');
                    imageObserver.unobserve(img);
                }
            });
        });

        lazyImages.forEach(function(img) {
            imageObserver.observe(img);
        });
    }

    // =====================================================
    // CONSOLE WELCOME MESSAGE
    // =====================================================
    console.log('%c FOSER Soluciones Industriales ', 'background: #4a7c4e; color: white; font-size: 16px; padding: 10px;');
    console.log('%c Automatización industrial en Navarra ', 'color: #4a7c4e; font-size: 12px;');
    console.log('%c www.foser.es | info@foser.es | 665 847 592 ', 'color: #888; font-size: 10px;');
});
