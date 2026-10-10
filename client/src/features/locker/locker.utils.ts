import type { LockerFieldInput } from './locker.types';

export const FIELD_TYPE_OPTIONS = [
    { value: 'text', label: 'Text' },
    { value: 'password', label: 'Password' },
    { value: 'number', label: 'Number' },
    { value: 'select', label: 'Select' },
    { value: 'date', label: 'Date' },
];

export const emptyField = (): LockerFieldInput => ({
    label: '',
    type: 'text',
    masked: false,
});

export const formatDate = (value?: string) => (value ? new Date(value).toLocaleDateString() : '');

export const getErrorMessage = (error: unknown, fallback: string) => {
    if (error && typeof error === 'object' && 'response' in error) {
        const response = (error as { response?: { data?: { message?: string | string[] } } }).response;
        const message = response?.data?.message;
        if (Array.isArray(message)) return message.join(', ');
        if (message) return message;
    }
    return fallback;
};