/**
 * TrackingModal Component
 * Allows users to record signal outcomes for calibration tracking
 */

import { useState } from 'react';
import { X, TrendingUp, TrendingDown, Clock, Ban } from 'lucide-react';
import { trackingApi, SignalOutcome } from '../services/trackingApi';

export interface TrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  opportunity: {
    id: string;
    symbol: string;
    signal_score: number;
    p_target: number;
    entry: number;
    stop: number;
    target1: number;
    rr_ratio: number;
  };
  onSuccess?: () => void;
}

export const TrackingModal: React.FC<TrackingModalProps> = ({
  isOpen,
  onClose,
  opportunity,
  onSuccess,
}) => {
  const [selectedOutcome, setSelectedOutcome] = useState<SignalOutcome | null>(null);
  const [exitPrice, setExitPrice] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const outcomeButtons: Array<{
    value: SignalOutcome;
    label: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
  }> = [
    {
      value: 'target_hit',
      label: 'Target Hit',
      icon: <TrendingUp className="w-5 h-5" />,
      color: 'text-green-700',
      bgColor: 'bg-green-50 hover:bg-green-100 border-green-300',
    },
    {
      value: 'stopped_out',
      label: 'Stopped Out',
      icon: <TrendingDown className="w-5 h-5" />,
      color: 'text-red-700',
      bgColor: 'bg-red-50 hover:bg-red-100 border-red-300',
    },
    {
      value: 'expired',
      label: 'Expired / No Entry',
      icon: <Clock className="w-5 h-5" />,
      color: 'text-gray-700',
      bgColor: 'bg-gray-50 hover:bg-gray-100 border-gray-300',
    },
    {
      value: 'still_open',
      label: 'Still Open',
      icon: <Ban className="w-5 h-5" />,
      color: 'text-blue-700',
      bgColor: 'bg-blue-50 hover:bg-blue-100 border-blue-300',
    },
  ];

  const handleSubmit = async () => {
    if (!selectedOutcome) {
      setError('Please select an outcome');
      return;
    }

    if (selectedOutcome !== 'expired' && !exitPrice) {
      setError('Please enter an exit price');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // First create the signal history entry
      const signal = await trackingApi.createSignal({
        opportunity_id: opportunity.id,
        symbol: opportunity.symbol,
        signal_score: opportunity.signal_score,
        p_target: opportunity.p_target,
        entry_price: opportunity.entry,
        stop_price: opportunity.stop,
        target_price: opportunity.target1,
        rr_ratio: opportunity.rr_ratio,
        notes,
      });

      // Then update with the outcome
      if (selectedOutcome !== 'still_open') {
        await trackingApi.updateSignalOutcome(signal.id, {
          outcome: selectedOutcome,
          exit_price: selectedOutcome === 'expired' ? opportunity.entry : parseFloat(exitPrice),
          exit_time: new Date().toISOString(),
          notes,
        });
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to track signal');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Track Signal Outcome</h2>
            <p className="text-sm text-gray-600 mt-1">{opportunity.symbol}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Signal Summary */}
        <div className="p-6 border-b border-gray-100 bg-gray-50">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Entry</p>
              <p className="font-semibold text-gray-900">${opportunity.entry.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-600">Stop</p>
              <p className="font-semibold text-red-600">${opportunity.stop.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-600">Target</p>
              <p className="font-semibold text-green-600">${opportunity.target1.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-600">R:R Ratio</p>
              <p className="font-semibold text-gray-900">{opportunity.rr_ratio.toFixed(2)}R</p>
            </div>
          </div>
        </div>

        {/* Outcome Selection */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              What happened with this signal?
            </label>
            <div className="grid grid-cols-2 gap-3">
              {outcomeButtons.map((button) => (
                <button
                  key={button.value}
                  onClick={() => setSelectedOutcome(button.value)}
                  className={`
                    p-4 rounded-lg border-2 transition-all duration-150
                    ${selectedOutcome === button.value
                      ? `${button.bgColor} border-opacity-100 ring-2 ring-offset-2 ring-blue-500`
                      : `bg-white border-gray-200 hover:border-gray-300`
                    }
                  `}
                >
                  <div className={`flex flex-col items-center space-y-2 ${button.color}`}>
                    {button.icon}
                    <span className="text-xs font-medium text-center">{button.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Exit Price Input */}
          {selectedOutcome && selectedOutcome !== 'expired' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Exit Price *
              </label>
              <input
                type="number"
                step="0.01"
                value={exitPrice}
                onChange={(e) => setExitPrice(e.target.value)}
                placeholder="Enter exit price..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any observations or lessons learned..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedOutcome}
            className={`
              px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors
              ${isSubmitting || !selectedOutcome
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
              }
            `}
          >
            {isSubmitting ? 'Tracking...' : 'Track Outcome'}
          </button>
        </div>
      </div>
    </div>
  );
};
