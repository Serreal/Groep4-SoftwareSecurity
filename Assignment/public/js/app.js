let auth0 = null;

const fetchAuthConfig = () => fetch("/auth_config.json");

const configureClient = async() => {
    const response = await fetchAuthConfig();
    const config = await response.json();
    console.log(response);
    console.log(config);

    auth0 = await createAuth0Client({
        domain: config.domain,
        client_id: config.clientId,
        audience: config.audience
    });
};

window.onload = async() => {
    await configureClient();

    //Update the UI state
    updateUI();

    const isAuthenticated = await auth0.isAuthenticated();

    if (isAuthenticated) {
        //Show the gated content
        console.log("user is authenticated")
        return;
    }

    const query = window.location.search;
    if (query.includes("code=") && query.includes("state=")) {

        // Process the login state
        await auth0.handleRedirectCallback();

        updateUI();

        // Use replaceState to redirect the user away and remove the querystring parameters
        window.history.replaceState({}, document.title, "/");
    }

};

const updateUI = async() => {
    try {
        const isAuthenticated = await auth0.isAuthenticated();
        console.log(isAuthenticated);

        document.getElementById("btn-logout").disabled = !isAuthenticated;
        document.getElementById("btn-login").disabled = isAuthenticated;

        document.getElementById("btn-call-api").disabled = !isAuthenticated;

        //Logic to show/hide gated content after authentication
        if (isAuthenticated) {
            document.getElementById("gated-content").classList.remove("hidden");

            document.getElementById(
                "ipt-access-token"
            ).innerHTML = await auth0.getTokenSilently();

            document.getElementById("ipt-user-profile").textContent = JSON.stringify(
                await auth0.getUser()
            );

            document.getElementById("gated-content").classList.remove("hidden");

        } else {
            document.getElementById("gated-content").classList.add("hidden");
        }
    } catch (err) {
        console.log("Error updating UI!", err);
        return;
    }
};

const login = async() => {
    await auth0.loginWithRedirect({
        redirect_uri: window.location.origin
    });
};

const logout = () => {
    auth0.logout({
        returnTo: window.location.origin
    });
};

const callApi = async() => {
    try {

        // Get the access token from the Auth0 client
        const token = await auth0.getTokenSilently();

        // Make the call to the API, setting the token in the Authorization header
        const response = await fetch("/api/external", {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        // Fetch the JSON result
        const responseData = await response.json();

        // Display the result in the output element
        const responseElement = document.getElementById("api-call-result");

        responseElement.innerText = JSON.stringify(responseData, {}, 2);

    } catch (e) {
        console.error(e);
    }
};