// Function to switch between tabs
function showTab(targetId) {
    // Update tab visibility
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.getElementById(targetId).classList.add('active');

    // Update button states
    document.querySelectorAll('.nav-button').forEach(button => {
        button.classList.remove('active');
        if (button.getAttribute('data-target') === targetId) {
            button.classList.add('active');
        }
    });
}

// Event listeners for navigation buttons
document.querySelectorAll('.nav-button').forEach(button => {
    button.addEventListener('click', () => {
        showTab(button.getAttribute('data-target'));
    });
});

// Initialize by showing the info tab
showTab('info');
