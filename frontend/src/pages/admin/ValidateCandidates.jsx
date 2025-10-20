import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useElection } from '../../hooks/useElection';
import { useUI } from '../../hooks/useUI';
import { useWallet } from '../../hooks/useWallet';

/**
 * Admin - Create / Validate Election form
 * Route: /admin/validate-candidates
 *
 * Requirements implemented:
 * - Access control: only ElectionManager (via useElection.isElectionManager)
 * - Form fields: name, description, registrationDeadline, startTime, endTime
 * - Validation:
 *     - name required
 *     - all timestamps must be future
 *     - registrationDeadline < startTime < endTime
 * - Submit:
 *     1. client validation
 *     2. call createNewElection (from useElection)
 *     3. show transaction modal while creating
 *     4. on success -> navigate to election detail
 *     5. on error -> show error
 *
 * Preview card included
 */

const ValidateCandidates = () => {
  const navigate = useNavigate();
  const { account } = useWallet();
  const {
    createNewElection, // from hook: creates election (dispatch/create thunk)
    isElectionManager, // boolean (hook exposes user's role check)
  } = useElection();

  const { showError, showSuccess, showTransactionModal, hideTransactionModal } = useUI();

  const [form, setForm] = useState({
    name: '',
    description: '',
    registrationDeadline: '', // datetime-local string
    startTime: '',
    endTime: '',
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // simple guard: if role info exists and user not manager, keep it (no redirect here)
    // Navigation / redirect could be added if app requires
  }, [isElectionManager]);

  const validate = () => {
    const err = {};
    const now = new Date();

    if (!form.name || form.name.trim() === '') {
      err.name = 'Election name is required';
    }

    const toDate = (s) => (s ? new Date(s) : null);

    const reg = toDate(form.registrationDeadline);
    const start = toDate(form.startTime);
    const end = toDate(form.endTime);

    if (!reg) err.registrationDeadline = 'Registration deadline is required';
    if (!start) err.startTime = 'Start time is required';
    if (!end) err.endTime = 'End time is required';

    if (reg && reg <= now) err.registrationDeadline = 'Registration deadline must be in the future';
    if (start && start <= now) err.startTime = 'Start time must be in the future';
    if (end && end <= now) err.endTime = 'End time must be in the future';

    if (reg && start && !(reg < start)) err.registrationDeadline = 'Registration deadline must be before start time';
    if (start && end && !(start < end)) err.startTime = 'Start time must be before end time';

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const onChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isElectionManager) {
      showError?.('Unauthorized', 'Only Election Managers can create elections');
      return;
    }

    if (!validate()) return;

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      // convert to ISO strings (backend/hook should accept these)
      registrationDeadline: new Date(form.registrationDeadline).toISOString(),
      startTime: new Date(form.startTime).toISOString(),
      endTime: new Date(form.endTime).toISOString(),
      // optional flags
      isActive: true,
    };

    try {
      setSubmitting(true);
      showTransactionModal?.({
        title: 'Creating Election',
        description: 'Please confirm transaction in your wallet and wait for confirmation.',
        loading: true
      });

      const result = await createNewElection(payload);

      hideTransactionModal?.();

      // Expecting result to contain electionId or _id
      const newId = result?.electionId ?? result?._id ?? result;
      showSuccess?.('Election created', 'Redirecting to election detail');

      if (newId) {
        navigate(`/election/${newId}`);
      } else {
        // fallback: go to admin list or reload
        navigate('/admin');
      }
    } catch (err) {
      hideTransactionModal?.();
      const message = (err && err.message) ? err.message : 'Failed to create election';
      showError?.('Create Election Failed', message);
    } finally {
      setSubmitting(false);
    }
  };

  // Access control UI
  if (isElectionManager === false) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <h3 className="text-lg font-semibold">Access denied</h3>
          <p className="text-sm text-gray-600 mt-2">You need Election Manager privileges to create or validate elections.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-xl border shadow-sm p-6">
        <h2 className="text-2xl font-bold mb-2">Create Election</h2>
        <p className="text-sm text-gray-600 mb-4">Fill details and publish the election. All timestamps are in your local timezone.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Election Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={onChange('name')}
              className="mt-1 block w-full rounded-md border-gray-200 shadow-sm p-2"
              placeholder="e.g. Student Council 2025"
              disabled={submitting}
            />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={form.description}
              onChange={onChange('description')}
              rows={4}
              className="mt-1 block w-full rounded-md border-gray-200 shadow-sm p-2"
              placeholder="Brief description (optional)"
              disabled={submitting}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Registration Deadline *</label>
              <input
                type="datetime-local"
                value={form.registrationDeadline}
                onChange={onChange('registrationDeadline')}
                className="mt-1 block w-full rounded-md border-gray-200 shadow-sm p-2"
                disabled={submitting}
              />
              {errors.registrationDeadline && <p className="text-xs text-red-600 mt-1">{errors.registrationDeadline}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Start Time *</label>
              <input
                type="datetime-local"
                value={form.startTime}
                onChange={onChange('startTime')}
                className="mt-1 block w-full rounded-md border-gray-200 shadow-sm p-2"
                disabled={submitting}
              />
              {errors.startTime && <p className="text-xs text-red-600 mt-1">{errors.startTime}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">End Time *</label>
              <input
                type="datetime-local"
                value={form.endTime}
                onChange={onChange('endTime')}
                className="mt-1 block w-full rounded-md border-gray-200 shadow-sm p-2"
                disabled={submitting}
              />
              {errors.endTime && <p className="text-xs text-red-600 mt-1">{errors.endTime}</p>}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            <div className="text-sm text-gray-600">
              <div>Creator: <span className="font-mono">{account ?? 'Not connected'}</span></div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => {
                  // reset preview / form
                  setForm({ name: '', description: '', registrationDeadline: '', startTime: '', endTime: '' });
                  setErrors({});
                }}
                className="px-4 py-2 rounded-lg border bg-white text-sm"
                disabled={submitting}
              >
                Reset
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {submitting ? 'Submitting...' : 'Create Election'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Preview Card */}
      <div className="mt-6">
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-2">Preview</h3>
          <div className="text-sm text-gray-700">
            <div className="mb-2"><span className="font-medium">Name:</span> {form.name || <span className="text-gray-400">—</span>}</div>
            <div className="mb-2"><span className="font-medium">Description:</span> {form.description || <span className="text-gray-400">—</span>}</div>
            <div className="mb-2"><span className="font-medium">Registration Deadline:</span> {form.registrationDeadline ? new Date(form.registrationDeadline).toLocaleString() : <span className="text-gray-400">—</span>}</div>
            <div className="mb-2"><span className="font-medium">Start Time:</span> {form.startTime ? new Date(form.startTime).toLocaleString() : <span className="text-gray-400">—</span>}</div>
            <div className="mb-2"><span className="font-medium">End Time:</span> {form.endTime ? new Date(form.endTime).toLocaleString() : <span className="text-gray-400">—</span>}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ValidateCandidates;