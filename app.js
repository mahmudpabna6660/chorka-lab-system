// ==========================================
// CHORKA TEXTILE LTD.
// SHADE UPDATE REPORT SYSTEM
// COMPLETE LOGIN + ROLE CHECK
// ==========================================


// 1. SUPABASE CONFIGURATION

const SUPABASE_URL =
    "https://qvexepszsqrjgjvobuju.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_6VkM2ZGMwx9vpyLPX33llg_GC7elJ7f";


// 2. INITIALIZE SUPABASE

if (!window.supabase) {
    alert("Supabase লোড হয়নি। ইন্টারনেট সংযোগ পরীক্ষা করুন।");
}

const supabaseClient = window.supabase
    ? window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    )
    : null;


// 3. LOGIN ELEMENTS

const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginButton = document.getElementById("loginButton");
const message = document.getElementById("message");
const togglePassword = document.getElementById("togglePassword");


// 4. SHOW MESSAGE

function showMessage(text, type = "error") {
    if (!message) {
        alert(text);
        return;
    }

    message.textContent = text;
    message.style.color =
        type === "success" ? "#047857" : "#dc2626";
}


// 5. SHOW / HIDE PASSWORD

if (togglePassword && passwordInput) {
    togglePassword.addEventListener("click", function () {
        if (passwordInput.type === "password") {
            passwordInput.type = "text";
            togglePassword.textContent = "🙈";
        } else {
            passwordInput.type = "password";
            togglePassword.textContent = "👁";
        }
    });
}


// 6. GET USER ROLE

async function getUserRole(userId) {
    if (!supabaseClient || !userId) {
        throw new Error("ব্যবহারকারীর তথ্য পাওয়া যায়নি।");
    }

    const { data, error } = await supabaseClient
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

    if (error) {
        throw error;
    }

    return data?.role || null;
}


// 7. LOGIN FORM

if (loginForm) {
    loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        if (!supabaseClient) {
            showMessage("Supabase সংযোগ পাওয়া যায়নি।");
            return;
        }

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
            showMessage("ইমেইল ও পাসওয়ার্ড লিখুন।");
            return;
        }

        loginButton.disabled = true;
        loginButton.textContent = "লগইন হচ্ছে...";
        showMessage("", "success");

        try {
            const { data, error } =
                await supabaseClient.auth.signInWithPassword({
                    email: email,
                    password: password
                });

            if (error) {
                throw error;
            }

            if (!data.session || !data.user) {
                throw new Error("লগইন সেশন তৈরি হয়নি।");
            }

            // Verify role from Supabase
            const role = await getUserRole(data.user.id);

            if (role !== "admin" && role !== "user") {
                await supabaseClient.auth.signOut();
                sessionStorage.removeItem("appRole");

                showMessage(
                    "আপনার অ্যাকাউন্টে Role সেট করা নেই। Admin-এর সঙ্গে যোগাযোগ করুন।"
                );

                return;
            }

            sessionStorage.setItem("appRole", role);

            showMessage(
                "লগইন সফল! Dashboard খুলছে...",
                "success"
            );

            window.location.assign("./dashboard.html");

        } catch (error) {
            console.error("Login error:", error);

            const errorText = (error.message || "").toLowerCase();

            if (errorText.includes("invalid login credentials")) {
                showMessage("ইমেইল অথবা পাসওয়ার্ড সঠিক নয়।");

            } else if (errorText.includes("email not confirmed")) {
                showMessage(
                    "আপনার ইমেইল নিশ্চিত করা হয়নি। Supabase Authentication থেকে নিশ্চিত করুন।"
                );

            } else if (
                errorText.includes("user_roles") ||
                errorText.includes("permission denied") ||
                errorText.includes("row-level security")
            ) {
                showMessage(
                    "Role যাচাই করা যাচ্ছে না। Supabase-এর user_roles Table ও Permissions পরীক্ষা করুন।"
                );

            } else {
                showMessage(
                    "লগইন সমস্যা: " + (error.message || "অজানা সমস্যা")
                );
            }

        } finally {
            loginButton.disabled = false;
            loginButton.textContent = "লগইন করুন";
        }
    });
}


// 8. CHECK EXISTING SESSION

async function checkExistingSession() {
    if (!supabaseClient) return;

    const currentPage = window.location.pathname;

    const isLoginPage =
        currentPage.endsWith("/") ||
        currentPage.endsWith("/index.html");

    if (!isLoginPage) return;

    try {
        const { data, error } =
            await supabaseClient.auth.getSession();

        if (error) throw error;

        if (data.session?.user) {
            const role = await getUserRole(data.session.user.id);

            if (role === "admin" || role === "user") {
                sessionStorage.setItem("appRole", role);
                window.location.replace("./dashboard.html");
            } else {
                await supabaseClient.auth.signOut();
                sessionStorage.removeItem("appRole");
            }
        }

    } catch (error) {
        console.error("Session check error:", error);
    }
}


// 9. INITIALIZE

checkExistingSession();