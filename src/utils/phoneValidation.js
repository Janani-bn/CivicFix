const MIN_PHONE_DIGITS = 10;

export const countDigits = (value) => {
    if (typeof value !== 'string') return 0;
    const matches = value.match(/\d/g);
    return matches ? matches.length : 0;
};

// Empty stays permissible where the form allows it. A present number must
// hold enough digits to survive complaint validation at submit time.
export const isAcceptablePhone = (value) => {
    if (!value) return true;
    return countDigits(value) >= MIN_PHONE_DIGITS;
};

export { MIN_PHONE_DIGITS };
