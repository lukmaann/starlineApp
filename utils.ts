/**
 * Formats a date string or Date object to DD/MM/YY format.
 * @param dateInput ISO date string or Date object
 * @returns Formatted date string (e.g., 28/01/26)
 */
export const formatDate = (dateInput: string | Date | undefined | null): string => {
    if (!dateInput) return 'N/A';

    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;

    if (isNaN(date.getTime())) return 'N/A';

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);

    return `${day}/${month}/${year}`;
};

/**
 * Returns the current date in YYYY-MM-DD format based on local timezone.
 * Uses 'en-CA' locale which naturally outputs YYYY-MM-DD.
 */
export const getLocalDate = (): string => {
    const now = new Date();
    // 'en-CA' is the locale for Canada, which uses YYYY-MM-DD as standard
    return now.toLocaleDateString('en-CA');
};
