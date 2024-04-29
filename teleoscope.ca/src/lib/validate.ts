export const validateEmail = (email: string | FormDataEntryValue): boolean => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email.toString());
  };

export const validatePassword = (password: string | FormDataEntryValue): boolean => {
    const regex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z\d]).{8,}$/;
    return regex.test(password.toString());
  };