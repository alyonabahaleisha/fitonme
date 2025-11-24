import { useState } from 'react';
import { X, CreditCard, AlertTriangle, Trash2, Calendar, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface AccountSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const AccountSettings = ({ isOpen, onClose }: AccountSettingsProps) => {
  const { user, userData } = useAuth();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const getPlanDetails = () => {
    const planType = userData?.plan_type || 'free';
    switch (planType) {
      case 'free':
        return { name: 'Free Preview', price: '$0', features: '2 AI try-ons' };
      case 'weekly':
        return { name: 'Weekly Pass', price: '$6.99/week', features: '30 try-ons per week' };
      case 'monthly':
        return { name: 'Monthly Plan', price: '$14.99/month', features: 'Unlimited try-ons' };
      case 'annual':
        return { name: 'Annual Pro Closet', price: '$59/year', features: 'Everything + Closet sync' };
      default:
        return { name: 'Free Preview', price: '$0', features: '2 AI try-ons' };
    }
  };

  const planDetails = getPlanDetails();
  const hasActiveSubscription = userData?.plan_type && userData.plan_type !== 'free';

  const handleCancelSubscription = async () => {
    if (!user) return;

    setIsProcessing(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/cancel-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          reason: cancelReason,
        }),
      });

      const data = await response.json();
      console.log('Cancel subscription response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel subscription');
      }

      alert('Your subscription has been cancelled. You can continue to use it until the end of your billing period.');
      setShowCancelModal(false);
      onClose();
      // Refresh page to update user data
      window.location.reload();
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      alert(`Failed to cancel subscription: ${error.message}\nPlease try again or contact support.`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user || deleteConfirmText !== user.email) return;

    setIsProcessing(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/delete-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
        }),
      });

      const data = await response.json();
      console.log('Delete account response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete account');
      }

      alert('Your account has been deleted. You will be logged out.');
      // Sign out will be handled by the auth context
      window.location.href = '/';
    } catch (error) {
      console.error('Error deleting account:', error);
      alert(`Failed to delete account: ${error.message}\nPlease try again or contact support.`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="min-h-full flex items-center justify-center p-4">
          <div
            className="bg-white rounded-2xl max-w-2xl w-full p-6 relative shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Header */}
            <div className="mb-6">
              <h2 className="text-2xl font-serif font-semibold text-gray-900 mb-1">
                Account Settings
              </h2>
              <p className="text-gray-600 text-sm">{user?.email}</p>
            </div>

            {/* Subscription Section */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Subscription
              </h3>

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900">{planDetails.name}</h4>
                    <p className="text-gray-600 text-sm mt-1">{planDetails.features}</p>
                    <p className="text-gray-900 font-semibold mt-2">{planDetails.price}</p>

                    {hasActiveSubscription && (
                      <div className="flex items-center gap-2 mt-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-600">Active subscription</span>
                      </div>
                    )}
                  </div>

                  {hasActiveSubscription && (
                    <button
                      onClick={() => setShowCancelModal(true)}
                      className="text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                      Cancel Plan
                    </button>
                  )}
                </div>
              </div>

              {!hasActiveSubscription && (
                <p className="text-sm text-gray-600">
                  You're currently on the free plan. Upgrade to unlock unlimited try-ons!
                </p>
              )}
            </div>

            {/* Danger Zone */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                Danger Zone
              </h3>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900">Delete Account</h4>
                    <p className="text-gray-600 text-sm mt-1">
                      Permanently delete your account and all data. This action cannot be undone.
                    </p>
                  </div>

                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="text-sm text-red-600 hover:text-red-700 font-medium whitespace-nowrap ml-4"
                  >
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Subscription Modal */}
      {showCancelModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[60] backdrop-blur-sm" />
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Cancel Subscription?
              </h3>

              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-gray-700">
                  <strong>You'll lose access to:</strong>
                </p>
                <ul className="text-sm text-gray-600 mt-2 space-y-1 list-disc list-inside">
                  <li>Unlimited AI try-ons</li>
                  <li>Full catalog access</li>
                  <li>HD quality renders</li>
                  <li>Priority support</li>
                </ul>
                <p className="text-sm text-gray-700 mt-3">
                  You can continue using your subscription until the end of your billing period.
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Help us improve (optional)
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff6b5a] focus:border-transparent"
                >
                  <option value="">Select a reason...</option>
                  <option value="too_expensive">Too expensive</option>
                  <option value="not_using">Not using it enough</option>
                  <option value="technical_issues">Technical issues</option>
                  <option value="found_alternative">Found an alternative</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Keep Subscription
                </button>
                <button
                  onClick={handleCancelSubscription}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {isProcessing ? 'Cancelling...' : 'Cancel Subscription'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[60] backdrop-blur-sm" />
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-full">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">
                  Delete Account?
                </h3>
              </div>

              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800 font-medium mb-2">
                  This action cannot be undone!
                </p>
                <p className="text-sm text-gray-700">
                  This will permanently delete:
                </p>
                <ul className="text-sm text-gray-600 mt-2 space-y-1 list-disc list-inside">
                  <li>Your profile and account data</li>
                  <li>All uploaded photos</li>
                  <li>Generated try-on images</li>
                  <li>Saved favorites</li>
                  <li>Active subscriptions</li>
                </ul>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type <strong>{user?.email}</strong> to confirm:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={user?.email}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirmText('');
                  }}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={isProcessing || deleteConfirmText !== user?.email}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? 'Deleting...' : 'Delete Account'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default AccountSettings;
