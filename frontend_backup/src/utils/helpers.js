// Helper functions for J.A.R.V.I.S.
// e.g., formatting dates, parsing text, managing local storage

export const formatTime = (date) => {
    return new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    }).format(date);
};
