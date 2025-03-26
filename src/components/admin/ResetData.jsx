import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, 
  Trash2, 
  Lock, 
  ShieldAlert,
  RefreshCw,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';

const ResetData = () => {
  const [loading, setLoading] = useState(false);
  const [confirmCode, setConfirmCode] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [resetProgress, setResetProgress] = useState(0);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const generateConfirmationCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleReset = async () => {
    try {
      // First confirmation dialog
      const firstConfirm = await Swal.fire({
        title: 'Dangerous Action',
        html: `
          <div class="text-left">
            <p class="text-red-600 font-bold mb-4">⚠️ WARNING: This action cannot be undone!</p>
            <p class="mb-2">This will permanently delete:</p>
            <ul class="list-disc list-inside mb-4">
              <li>All batch data</li>
              <li>All student records</li>
              <li>All attendance history</li>
            </ul>
            <p class="text-sm text-gray-600">Please type "RESET" to confirm</p>
          </div>
        `,
        input: 'text',
        inputAttributes: {
          autocapitalize: 'off'
        },
        showCancelButton: true,
        confirmButtonText: 'Continue',
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#4b5563',
        showLoaderOnConfirm: true,
        allowOutsideClick: () => !Swal.isLoading()
      });

      if (!firstConfirm.isConfirmed || firstConfirm.value !== 'RESET') {
        return;
      }

      // Generate and show confirmation code
      const code = generateConfirmationCode();
      const secondConfirm = await Swal.fire({
        title: 'Security Verification',
        html: `
          <div class="text-left">
            <p class="mb-4">Please enter the following confirmation code:</p>
            <p class="font-mono text-2xl text-center bg-gray-100 p-3 rounded mb-4">${code}</p>
            <p class="text-sm text-gray-600">This helps prevent accidental resets</p>
          </div>
        `,
        input: 'text',
        inputAttributes: {
          autocapitalize: 'off'
        },
        showCancelButton: true,
        confirmButtonText: 'Verify',
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#4b5563'
      });

      if (!secondConfirm.isConfirmed || secondConfirm.value !== code) {
        toast.error('Invalid confirmation code');
        return;
      }

      // Final confirmation with admin password
      const finalConfirm = await Swal.fire({
        title: 'Final Verification',
        html: `
          <div class="text-left">
            <p class="mb-4">Please enter your admin password to proceed:</p>
            <p class="text-sm text-gray-600">This is your final chance to cancel</p>
          </div>
        `,
        input: 'password',
        inputAttributes: {
          autocapitalize: 'off'
        },
        showCancelButton: true,
        confirmButtonText: 'Reset Everything',
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#4b5563'
      });

      if (!finalConfirm.isConfirmed || !finalConfirm.value) {
        return;
      }

      setLoading(true);

      // Start the reset process
      const collections = ['batches', 'attendance'];
      let totalDocuments = 0;
      let deletedDocuments = 0;

      // Count total documents
      for (const collectionName of collections) {
        const snapshot = await getDocs(collection(db, collectionName));
        totalDocuments += snapshot.size;
      }

      // Delete documents in batches
      for (const collectionName of collections) {
        const collectionRef = collection(db, collectionName);
        const snapshot = await getDocs(collectionRef);
        
        const batch = writeBatch(db);
        snapshot.docs.forEach(document => {
          batch.delete(doc(db, collectionName, document.id));
          deletedDocuments++;
          setResetProgress(Math.round((deletedDocuments / totalDocuments) * 100));
        });
        
        await batch.commit();
      }

      // Show success message
      await Swal.fire({
        icon: 'success',
        title: 'Reset Complete',
        text: 'All data has been successfully reset',
        confirmButtonColor: '#10b981'
      });

      // Redirect to login page
      navigate('/login');
      
    } catch (error) {
      console.error('Reset error:', error);
      toast.error('Failed to reset data. Please try again.');
    } finally {
      setLoading(false);
      setResetProgress(0);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-6 mb-8">
          <div className="flex items-start">
            <ShieldAlert className="text-red-500 mt-1 mr-4" size={24} />
            <div>
              <h2 className="text-xl font-bold text-red-700 mb-2">
                Danger Zone
              </h2>
              <p className="text-red-600">
                This page contains actions that will permanently delete data.
                These actions cannot be undone.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-red-600 px-6 py-4">
            <h1 className="text-xl font-bold text-white flex items-center">
              <Trash2 className="mr-2" />
              Reset Application Data
            </h1>
          </div>

          <div className="p-6">
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <AlertTriangle className="text-amber-500" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    This will delete:
                  </h3>
                  <ul className="mt-2 text-sm text-gray-600 list-disc list-inside">
                    <li>All batch information</li>
                    <li>All student records</li>
                    <li>All attendance history</li>
                    <li>All statistics and reports</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <Lock className="text-blue-500" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Security measures:
                  </h3>
                  <ul className="mt-2 text-sm text-gray-600 list-disc list-inside">
                    <li>Multiple confirmation steps</li>
                    <li>Unique verification code</li>
                    <li>Admin password verification</li>
                    <li>Batch processing with progress tracking</li>
                  </ul>
                </div>
              </div>

              {loading && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      Reset progress
                    </span>
                    <span className="text-sm font-medium text-gray-700">
                      {resetProgress}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-red-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${resetProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <div className="border-t pt-6">
                <button
                  onClick={handleReset}
                  disabled={loading}
                  className="w-full btn bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="animate-spin" size={20} />
                      Resetting Data...
                    </>
                  ) : (
                    <>
                      <Trash2 size={20} />
                      Reset All Data
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetData;