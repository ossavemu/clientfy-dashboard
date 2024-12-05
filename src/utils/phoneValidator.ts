export const phoneValidator = {
  patterns: {
    mexico: /^(?:52)?[1-9][0-9]{9}$/,
    colombia: /^(?:57)?[3][0-9]{9}$/,
  },

  cleanPhoneNumber(phone: string) {
    return phone.replace(/[\s\-\(\)\+]/g, '');
  },

  validatePhone(phone: string) {
    if (!phone) {
      return { isValid: false, error: 'Número de teléfono requerido' };
    }

    const cleanNumber = this.cleanPhoneNumber(phone);

    if (this.patterns.mexico.test(cleanNumber)) {
      return {
        isValid: true,
        country: 'MX',
        cleanNumber: cleanNumber.slice(-10),
      };
    }

    if (this.patterns.colombia.test(cleanNumber)) {
      return {
        isValid: true,
        country: 'CO',
        cleanNumber: cleanNumber.slice(-10),
      };
    }

    return {
      isValid: false,
      error: 'Número de teléfono no válido para México o Colombia',
    };
  },
};
