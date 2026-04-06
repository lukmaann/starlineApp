/**
 * Validation utilities for customer data
 * ✅ Bug #9: Customer data validation
 */

export const validatePhone = (phone: string): { valid: boolean; error?: string } => {
    if (!phone || phone.trim() === '') {
        return { valid: false, error: 'Phone number is required' };
    }

    // Remove spaces and special characters
    const cleaned = phone.replace(/[\s\-()]/g, '');

    // Indian phone: 10 digits starting with 6-9
    if (!/^[6-9]\d{9}$/.test(cleaned)) {
        return { valid: false, error: 'Phone must be 10 digits starting with 6-9' };
    }

    return { valid: true };
};

export const validateName = (name: string): { valid: boolean; error?: string } => {
    if (!name || name.trim() === '') {
        return { valid: false, error: 'Name is required' };
    }

    const trimmed = name.trim();

    if (trimmed.length < 2) {
        return { valid: false, error: 'Name must be at least 2 characters' };
    }

    if (trimmed.length > 100) {
        return { valid: false, error: 'Name must be less than 100 characters' };
    }

    // Allow letters, spaces, and common name characters
    if (!/^[a-zA-Z\s.'-]+$/.test(trimmed)) {
        return { valid: false, error: 'Name can only contain letters, spaces, and basic punctuation' };
    }

    return { valid: true };
};

export const formatPhone = (phone: string): string => {
    // Remove all non-digits
    const cleaned = phone.replace(/\D/g, '');

    // Format as XXX-XXX-XXXX
    if (cleaned.length === 10) {
        return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }

    return phone;
};
