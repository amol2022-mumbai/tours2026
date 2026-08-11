import { useState, useCallback } from 'react';

export function useForm(initialValues = {}) {
  const [values, setValues] = useState(initialValues);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const setField = useCallback((name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));
  }, []);

  const setFields = useCallback((fields) => {
    setValues(prev => ({ ...prev, ...fields }));
  }, []);

  const resetForm = useCallback((newValues) => {
    setValues(newValues || initialValues);
    setErrors({});
    setSubmitting(false);
  }, [initialValues]);

  const handleSubmit = useCallback(async (submitFn) => {
    setSubmitting(true);
    setErrors({});
    try {
      const result = await submitFn(values);
      return result;
    } catch (err) {
      if (err.response?.data?.details) {
        const fieldErrors = {};
        err.response.data.details.forEach(d => { fieldErrors[d.field] = d.message; });
        setErrors(fieldErrors);
      }
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, [values]);

  return { values, setField, setFields, resetForm, handleSubmit, submitting, errors, setErrors };
}
