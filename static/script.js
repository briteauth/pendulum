document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("authForm");
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const confirmPasswordInput = document.getElementById("confirmPassword");
    const confirmGroup = document.getElementById("confirmGroup");
    const submitButton = document.getElementById("submitBtn");
    const retryButton = document.getElementById("retryBtn");
    const resultEl = document.getElementById("result");
    const timerEl = document.getElementById("timer");
    const confirmTimerEl = document.getElementById("confirmTimer");
    const modeInputs = document.querySelectorAll("input[name='mode']");
    const passwordDisplay = document.getElementById("passwordDisplay");
    const displayedPassword = document.getElementById("displayedPassword");
    const timingGraph = document.getElementById("timingGraph");
    const homePage = document.getElementById("homePage");
    const logoutBtn = document.getElementById("logoutBtn");
    const terminal = document.querySelector(".terminal");
    const togglePasswordBtn = document.getElementById("togglePassword");
    const toggleConfirmPasswordBtn = document.getElementById("toggleConfirmPassword");

    let startTime = null;
    let confirmStartTime = null;
    let times = [];
    let confirmTimes = [];
    let pressedKeys = new Set();
    let confirmPressedKeys = new Set();
    let timerInterval = null;
    let confirmTimerInterval = null;
    const MAX_TIME = 15000;

    function navigateTo(path) {
        history.pushState(null, null, path);
        handleRoute();
    }
    
    function handleRoute() {
        const path = window.location.pathname;
        
        if (path === '/register') {
            document.querySelector("input[value='register']").checked = true;
            updateForm();
        } else if (path === '/home' || path === '/dashboard') {
            if (sessionStorage.getItem('loggedIn')) {
                const username = sessionStorage.getItem('username');
                const password = sessionStorage.getItem('password');
                showHomePage(username, password);
            } else {
                navigateTo('/login');
            }
        } else {
            document.querySelector("input[value='login']").checked = true;
            updateForm();
        }
    }
    
    window.addEventListener('popstate', handleRoute);
    handleRoute();
    
    // Password visibility toggle functionality
    togglePasswordBtn.addEventListener('click', () => {
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';
        togglePasswordBtn.textContent = isPassword ? 'HIDE' : 'SHOW';
    });
    
    toggleConfirmPasswordBtn.addEventListener('click', () => {
        const isPassword = confirmPasswordInput.type === 'password';
        confirmPasswordInput.type = isPassword ? 'text' : 'password';
        toggleConfirmPasswordBtn.textContent = isPassword ? 'HIDE' : 'SHOW';
    });
    
    function showHomePage(username, password) {
        terminal.style.display = 'none';
        homePage.style.display = 'block';
        
        sessionStorage.setItem('loggedIn', 'true');
        sessionStorage.setItem('username', username);
        sessionStorage.setItem('password', password);
    }
    
    logoutBtn.addEventListener('click', () => {
        homePage.style.display = 'none';
        terminal.style.display = 'block';
        resetSystem();
        resultEl.textContent = '';
        resultEl.className = 'result';
        sessionStorage.clear();
        navigateTo('/login');
    });

    retryButton.addEventListener("click", () => {
        resetSystem();
        resultEl.textContent = "SYSTEM RESET - READY FOR NEW ATTEMPT";
        resultEl.className = "result";
        passwordDisplay.style.display = "none";
    });

    function showLoadingAnimation() {
        const btnText = submitButton.querySelector('.btn-text');
        btnText.textContent = 'PROCESSING...';
    }

    function hideLoadingAnimation() {
        const btnText = submitButton.querySelector('.btn-text');
        btnText.textContent = 'EXECUTE';
    }

    function stopTimers() {
        clearInterval(timerInterval);
        clearInterval(confirmTimerInterval);
    }

    function resetSystem() {
        stopTimers();
        startTime = null;
        confirmStartTime = null;
        times = [];
        confirmTimes = [];
        passwordInput.value = "";
        confirmPasswordInput.value = "";
        updateTimer();
        updateConfirmTimer();
        pressedKeys.clear();
        confirmPressedKeys.clear();
    }

    function createTimingGraph(avgTimes) {
        timingGraph.innerHTML = "";
        if (avgTimes.length === 0) return;
        
        const maxTime = Math.max(...avgTimes);
        
        avgTimes.forEach((time, index) => {
            const container = document.createElement("div");
            container.className = "timing-bar-container";
            
            const bar = document.createElement("div");
            bar.className = "timing-bar";
            const height = (time / maxTime) * 160 + 20;
            bar.style.height = `${height}px`;
            bar.title = `Keystroke ${index + 1}: ${time}s`;
            
            const label = document.createElement("div");
            label.className = "timing-label";
            label.textContent = `${time}s`;
            
            container.appendChild(bar);
            container.appendChild(label);
            timingGraph.appendChild(container);
        });
    }

    function updateTimer() {
        if (startTime === null) {
            timerEl.textContent = "0.000s";
            return;
        }
        const elapsed = performance.now() - startTime;
        if (elapsed >= MAX_TIME) {
            stopTimers();
            timerEl.textContent = "15.000s";
            resultEl.textContent = "TIME LIMIT REACHED - USE RETRY";
            resultEl.className = "result error";
            return;
        }
        timerEl.textContent = `${(elapsed / 1000).toFixed(3)}s`;
    }

    function updateConfirmTimer() {
        if (confirmStartTime === null) {
            confirmTimerEl.textContent = "0.000s";
            return;
        }
        const elapsed = performance.now() - confirmStartTime;
        if (elapsed >= MAX_TIME) {
            stopTimers();
            confirmTimerEl.textContent = "15.000s";
            resultEl.textContent = "TIME LIMIT REACHED - USE RETRY";
            resultEl.className = "result error";
            return;
        }
        confirmTimerEl.textContent = `${(elapsed / 1000).toFixed(3)}s`;
    }

    function updateForm() {
        const mode = document.querySelector("input[name='mode']:checked").value;
        const btnText = submitButton.querySelector('.btn-text');
        
        if (mode === "register") {
            confirmGroup.style.display = "block";
            btnText.textContent = "REGISTER";
        } else {
            confirmGroup.style.display = "none";
            btnText.textContent = "LOGIN";
        }
        
        resetSystem();
        passwordDisplay.style.display = "none";
        resultEl.textContent = "";
        resultEl.className = "result";
    }

    modeInputs.forEach(input => input.addEventListener("change", () => {
        if (input.value === 'login') {
            navigateTo('/login');
        } else {
            navigateTo('/register');
        }
        updateForm();
    }));

    document.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && (passwordInput === document.activeElement || confirmPasswordInput === document.activeElement)) {
            event.preventDefault();
            stopTimers();
            form.dispatchEvent(new Event('submit'));
        }
    });

    passwordInput.addEventListener("keydown", (event) => {
        if (event.key.length > 1) return;
        if (pressedKeys.has(event.key)) return;
        pressedKeys.add(event.key);

        if (startTime === null) {
            startTime = performance.now();
            timerInterval = setInterval(updateTimer, 50);
        }

        const elapsed = performance.now() - startTime;
        if (elapsed < MAX_TIME) {
            times.push(Number((elapsed / 1000).toFixed(3)));
            updateTimer();
        }
    });

    passwordInput.addEventListener("keyup", (event) => {
        pressedKeys.delete(event.key);
    });

    confirmPasswordInput.addEventListener("keydown", (event) => {
        if (event.key.length > 1) return;
        if (confirmPressedKeys.has(event.key)) return;
        confirmPressedKeys.add(event.key);

        if (confirmStartTime === null) {
            confirmStartTime = performance.now();
            confirmTimerInterval = setInterval(updateConfirmTimer, 50);
        }

        const elapsed = performance.now() - confirmStartTime;
        if (elapsed < MAX_TIME) {
            confirmTimes.push(Number((elapsed / 1000).toFixed(3)));
            updateConfirmTimer();
        }
    });

    confirmPasswordInput.addEventListener("keyup", (event) => {
        confirmPressedKeys.delete(event.key);
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        
        const mode = document.querySelector("input[name='mode']:checked").value;
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        const confirmPassword = confirmPasswordInput.value.trim();

        stopTimers();

        if (!username || !password) {
            resultEl.textContent = "USERNAME AND PASSWORD REQUIRED";
            resultEl.className = "result error";
            return;
        }

        if (mode === "register") {
            if (password !== confirmPassword) {
                resultEl.textContent = "PASSWORDS DO NOT MATCH";
                resultEl.className = "result error";
                return;
            }
        }

        let finalTimes = times;
        
        if (mode === "register" && confirmTimes.length > 0) {
            if (times.length !== confirmTimes.length) {
                resultEl.textContent = "TIMING MISMATCH - RETYPE PASSWORDS";
                resultEl.className = "result error";
                return;
            }
            finalTimes = [];
            for (let i = 0; i < times.length; i++) {
                finalTimes.push(Number(((times[i] + confirmTimes[i]) / 2).toFixed(3)));
            }
        }
        
        if (finalTimes.length !== password.length) {
            resultEl.textContent = "INVALID TIMING DATA - RETRY";
            resultEl.className = "result error";
            return;
        }

        if (password && finalTimes.length > 0) {
            displayedPassword.textContent = password;
            createTimingGraph(finalTimes);
            passwordDisplay.style.display = "block";
        }

        showLoadingAnimation();
        resultEl.textContent = "";
        resultEl.className = "result";

        const endpoint = `/api/${mode}`;
        const requestData = {
            username: username,
            password: password,
            times: finalTimes
        };

        try {
            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify(requestData)
            });
            
            let result;
            try {
                result = await response.json();
            } catch (parseError) {
                throw new Error('Invalid server response');
            }
            
            hideLoadingAnimation();
            
            if (result.ok) {
                if (result.message === "Signup successful") {
                    resultEl.textContent = "REGISTRATION SUCCESSFUL";
                    resultEl.className = "result success";
                    setTimeout(() => {
                        document.querySelector("input[value='login']").checked = true;
                        updateForm();
                        resultEl.textContent = "NOW YOU CAN LOGIN";
                    }, 2000);
                } else if (result.message === "Authentication successful") {
                    resultEl.textContent = "LOGIN SUCCESSFUL - REDIRECTING...";
                    resultEl.className = "result success";
                    setTimeout(() => {
                        navigateTo('/home');
                        showHomePage(username, password);
                    }, 1500);
                } else {
                    resultEl.textContent = result.message.toUpperCase();
                    resultEl.className = "result success";
                }
            } else {
                let errorMessage = result.message || 'Unknown error';
                if (errorMessage.includes('User not found')) {
                    resultEl.textContent = "USER NOT FOUND - PLEASE REGISTER FIRST";
                } else if (errorMessage.includes('Invalid password')) {
                    resultEl.textContent = "INCORRECT PASSWORD";
                } else if (errorMessage.includes('User already exists')) {
                    resultEl.textContent = "USERNAME ALREADY TAKEN";
                } else if (errorMessage.includes('Typing rhythm')) {
                    resultEl.textContent = "TYPING PATTERN MISMATCH - TRY AGAIN";
                } else {
                    resultEl.textContent = errorMessage.toUpperCase();
                }
                resultEl.className = "result error";
            }
            
        } catch (err) {
            hideLoadingAnimation();
            
            if (err.message.includes('Failed to fetch')) {
                resultEl.textContent = "CONNECTION ERROR - CHECK SERVER";
            } else {
                resultEl.textContent = `ERROR: ${err.message.toUpperCase()}`;
            }
            
            resultEl.className = "result error";
        }

        setTimeout(() => {
            resetSystem();
        }, 1000);
    });

    submitButton.addEventListener("click", (event) => {
        event.preventDefault();
        form.dispatchEvent(new Event('submit'));
    });
});