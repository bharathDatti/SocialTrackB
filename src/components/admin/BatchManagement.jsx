import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Plus, Edit, Trash2, Users, Link as LinkIcon, Calendar, QrCode, X, Search, ChevronDown, 
  Clock, CheckCircle, XCircle, Download, UserPlus, Mail, Monitor, Building, Copy, Share2 
} from 'lucide-react';
import { fetchBatches, addNewBatch, updateExistingBatch, deleteExistingBatch } from '../../store/slices/batchSlice';
import { toast } from 'react-toastify';
import { QRCodeSVG } from 'qrcode.react';
import Swal from 'sweetalert2';
import { saveAs } from 'file-saver';

const BatchManagement = () => {
  const dispatch = useDispatch();
  const { batches, loading, error } = useSelector(state => state.batches);
  const [showModal, setShowModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    course: '',
    startDate: '',
    students: [],
    allowedRadius: 100
  });
  const [studentFormData, setStudentFormData] = useState({
    name: '',
    email: '',
    phone: '',
    rollNumber: '',
    mode: 'offline',
  });

  useEffect(() => {
    dispatch(fetchBatches());
  }, [dispatch]);

  useEffect(() => {
    if (selectedBatch) {
      setFormData(selectedBatch);
    } else {
      setFormData({
        name: '',
        course: '',
        startDate: '',
        students: [],
        allowedRadius: 100
      });
    }
  }, [selectedBatch]);

  const generateRollNumber = (courseName, batchName, studentCount) => {
    const coursePrefix = courseName
      .split(' ')
      .map(word => word[0].toUpperCase())
      .join('');
    const batchMatch = batchName.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s*(\d{2})/i);
    const batchCode = batchMatch 
      ? `${batchMatch[1].substring(0, 1).toUpperCase()}${batchMatch[2]}`
      : 'B' + new Date().getFullYear().toString().substring(2);
    const studentNumber = (studentCount + 1).toString().padStart(2, '0');
    return `${coursePrefix}${batchCode}${studentNumber}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedBatch) {
        await dispatch(updateExistingBatch({ id: selectedBatch.id, batchData: formData })).unwrap();
        toast.success('Batch updated successfully');
      } else {
        await dispatch(addNewBatch(formData)).unwrap();
        toast.success('Batch created successfully');
      }
      setShowModal(false);
      setSelectedBatch(null);
    } catch (err) {
      toast.error('Error: ' + err);
    }
  };

  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBatch) return;

    try {
      const rollNumber = generateRollNumber(selectedBatch.course, selectedBatch.name, selectedBatch.students.length);
      const newStudent = {
        ...studentFormData,
        rollNumber,
        id: Date.now(),
        mode: studentFormData.mode
      };
      const updatedStudents = [...selectedBatch.students, newStudent];
      await dispatch(updateExistingBatch({ 
        id: selectedBatch.id, 
        batchData: { ...selectedBatch, students: updatedStudents } 
      })).unwrap();
      setStudentFormData({ name: '', email: '', phone: '', rollNumber: '', mode: 'offline' });
      setShowStudentModal(false);
      toast.success('Student added successfully');
    } catch (err) {
      toast.error('Error adding student: ' + err);
    }
  };

  const handleDeleteStudent = async (batchId, studentId) => {
    try {
      const result = await Swal.fire({
        title: 'Delete Student?',
        text: "This action cannot be undone!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#3b82f6',
        confirmButtonText: 'Yes, delete!'
      });

      if (result.isConfirmed) {
        const batch = batches.find(b => b.id === batchId);
        const updatedStudents = batch.students.filter(student => student.id !== studentId);
        await dispatch(updateExistingBatch({ 
          id: batchId, 
          batchData: { ...batch, students: updatedStudents } 
        })).unwrap();
        toast.success('Student deleted successfully');
      }
    } catch (err) {
      toast.error('Error deleting student: ' + err);
    }
  };

  const getAttendanceLink = (batchId) => {
    return `${window.location.origin}/student/attendance/${batchId}`;
  };

  const copyAttendanceLink = async (batchId) => {
    const link = getAttendanceLink(batchId);
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Attendance link copied to clipboard');
    } catch (err) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = link;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        toast.success('Attendance link copied to clipboard');
      } catch (copyErr) {
        toast.error('Failed to copy link');
      }
      document.body.removeChild(textArea);
    }
  };

  const shareAttendanceLink = async (batch) => {
    const link = getAttendanceLink(batch.id);
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Attendance Link for ${batch.name}`,
          text: `Mark your attendance for ${batch.course} - ${batch.name}`,
          url: link
        });
        toast.success('Link shared successfully');
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Error sharing:', err);
          toast.error('Failed to share link');
        }
      }
    } else {
      copyAttendanceLink(batch.id);
    }
  };

  const handleDeleteBatch = async (batchId) => {
    try {
      const result = await Swal.fire({
        title: 'Delete Batch?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#3b82f6',
        confirmButtonText: 'Yes, delete it!',
        cancelButtonText: 'Cancel'
      });

      if (result.isConfirmed) {
        await dispatch(deleteExistingBatch(batchId)).unwrap();
        toast.success('Batch deleted successfully');
      }
    } catch (err) {
      toast.error('Error deleting batch: ' + err);
    }
  };

  const downloadQRCode = (batch) => {
    const attendanceLink = getAttendanceLink(batch.id);
    const qrContainer = document.createElement('div');
    const root = ReactDOM.createRoot(qrContainer);
    
    root.render(
      <QRCodeSVG
        value={attendanceLink}
        size={1024}
        level="H"
        includeMargin={true}
      />
    );

    // Wait for React to finish rendering
    setTimeout(() => {
      const svgElement = qrContainer.querySelector('svg');
      if (svgElement) {
        const svgString = new XMLSerializer().serializeToString(svgElement);
        const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const fileName = `${batch.name}_${batch.course}_QR.svg`.replace(/\s+/g, '_');
        saveAs(blob, fileName);
        toast.success('QR Code downloaded successfully');
      } else {
        toast.error('Failed to generate QR code');
      }
      root.unmount();
    }, 100);
  };

  const showQRCode = (batch) => {
    const attendanceLink = getAttendanceLink(batch.id);
    
    Swal.fire({
      title: 'Attendance QR Code',
      html: `
        <div class="text-center">
          <div id="qrcode" class="inline-block p-4 bg-white rounded-lg shadow-md"></div>
          <p class="mt-4 text-lg font-semibold">${batch.name}</p>
          <p class="text-gray-600">${batch.course}</p>
          <p class="mt-2 text-sm text-gray-500 break-all">${attendanceLink}</p>
        </div>
      `,
      footer: `
        <div class="flex justify-center gap-4">
          <button id="downloadQr" class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
            <i class="fas fa-download mr-2"></i> Download QR
          </button>
          <button id="copyLink" class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
            <i class="fas fa-copy mr-2"></i> Copy Link
          </button>
          ${navigator.share ? `
            <button id="shareLink" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
              <i class="fas fa-share mr-2"></i> Share
            </button>
          ` : ''}
        </div>
      `,
      width: 'auto',
      padding: '2em',
      didRender: () => {
        const qrContainer = Swal.getPopup().querySelector('#qrcode');
        const root = ReactDOM.createRoot(qrContainer);
        
        root.render(
          <QRCodeSVG
            value={attendanceLink}
            size={256}
            level="H"
            includeMargin={true}
          />
        );

        const downloadBtn = Swal.getFooter().querySelector('#downloadQr');
        downloadBtn.addEventListener('click', () => downloadQRCode(batch));

        const copyBtn = Swal.getFooter().querySelector('#copyLink');
        copyBtn.addEventListener('click', () => copyAttendanceLink(batch.id));

        const shareBtn = Swal.getFooter().querySelector('#shareLink');
        if (shareBtn) {
          shareBtn.addEventListener('click', () => shareAttendanceLink(batch));
        }
      },
      willUnmount: () => {
        const qrContainer = Swal.getPopup()?.querySelector('#qrcode');
        if (qrContainer) {
          const root = ReactDOM.createRoot(qrContainer);
          root.unmount();
        }
      },
      showCloseButton: true,
      showConfirmButton: false,
      customClass: {
        popup: 'rounded-xl',
        footer: 'border-t pt-4'
      }
    });
  };

  const filteredBatches = batches.filter(batch => 
    batch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    batch.course.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="spinner-border text-primary-600" role="status">
          <span className="sr-only">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 p-8">
        <p>Error: {error}</p>
        <button 
          className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          onClick={() => dispatch(fetchBatches())}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Batch Management</h1>
          <p className="text-gray-600 mt-1">Manage your training batches and students</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="relative flex-grow sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search batches..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            className="btn btn-primary flex items-center justify-center gap-2 whitespace-nowrap"
            onClick={() => {
              setSelectedBatch(null);
              setShowModal(true);
            }}
            disabled={loading}
          >
            <Plus size={20} />
            Create Batch
          </button>
        </div>
      </div>

      {filteredBatches.length === 0 ? (
        <div className="text-center text-gray-600 py-12">
          <p>No batches found. Create a new batch to get started!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBatches.map(batch => (
            <div key={batch.id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
              <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white truncate">{batch.name}</h3>
                    <span className="inline-block bg-white/20 text-white text-sm px-2 py-1 rounded-full mt-2">
                      {batch.course}
                    </span>
                  </div>
                  <div className="relative group">
                    <button className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                      <ChevronDown className="text-white" size={20} />
                    </button>
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                      <div className="py-1">
                        <button onClick={() => { setSelectedBatch(batch); setShowModal(true); }} className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center">
                          <Edit size={16} className="mr-2" /> Edit Batch
                        </button>
                        <button onClick={() => { setSelectedBatch(batch); setShowStudentModal(true); }} className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center">
                          <UserPlus size={16} className="mr-2" /> Add Student
                        </button>
                        <button onClick={() => copyAttendanceLink(batch.id)} className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center">
                          <Copy size={16} className="mr-2" /> Copy Link
                        </button>
                        {navigator.share && (
                          <button onClick={() => shareAttendanceLink(batch)} className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center">
                            <Share2 size={16} className="mr-2" /> Share Link
                          </button>
                        )}
                        <button onClick={() => showQRCode(batch)} className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center">
                          <QrCode size={16} className="mr-2" /> Show QR Code
                        </button>
                        <button onClick={() => handleDeleteBatch(batch.id)} className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center">
                          <Trash2 size={16} className="mr-2" /> Delete Batch
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4">
                <div className="space-y-3">
                  <div className="flex items-center text-gray-600">
                    <Calendar size={16} className="mr-2" />
                    <span className="text-sm">Started: {new Date(batch.startDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-gray-600">
                      <Users size={16} className="mr-2" />
                      <span className="text-sm">{batch.students?.length || 0} Students</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="flex items-center text-sm text-gray-600">
                        <Building size={14} className="mr-1" />
                        {batch.students?.filter(s => s.mode === 'offline').length || 0} Offline
                      </span>
                      <span className="flex items-center text-sm text-gray-600">
                        <Monitor size={14} className="mr-1" />
                        {batch.students?.filter(s => s.mode === 'online').length || 0} Online
                      </span>
                    </div>
                  </div>
                </div>
                {batch.students?.length > 0 && (
                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-medium text-gray-700">Students</h4>
                      <div className="flex gap-2">
                        <button className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200" onClick={() => {
                          const offlineStudents = batch.students.filter(s => s.mode === 'offline');
                          if (offlineStudents.length > 0) {
                            const list = offlineStudents.map(s => `${s.name} (${s.rollNumber})`).join('\n');
                            Swal.fire({ title: 'Offline Students', text: list, icon: 'info' });
                          }
                        }}>
                          <Building size={12} className="inline mr-1" /> Offline List
                        </button>
                        <button className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200" onClick={() => {
                          const onlineStudents = batch.students.filter(s => s.mode === 'online');
                          if (onlineStudents.length > 0) {
                            const list = onlineStudents.map(s => `${s.name} (${s.rollNumber})`).join('\n');
                            Swal.fire({ title: 'Online Students', text: list, icon: 'info' });
                          }
                        }}>
                          <Monitor size={12} className="inline mr-1" /> Online List
                        </button>
                      </div>
                    </div>
                    <div className="max-h-40 overflow-y-auto">
                      {batch.students.map(student => (
                        <div key={student.id} className="flex items-center justify-between py-2 border-b last:border-0">
                          <div className="flex items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              student.mode === 'online' ? 'bg-blue-100' : 'bg-green-100'
                            }`}>
                              {student.mode === 'online' ? (
                                <Monitor size={14} className="text-blue-600" />
                              ) : (
                                <Building size={14} className="text-green-600" />
                              )}
                            </div>
                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-900">{student.name}</p>
                              <p className="text-xs text-gray-500">
                                {student.rollNumber}
                                <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${
                                  student.mode === 'online' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                                }`}>
                                  {student.mode}
                                </span>
                              </p>
                            </div>
                          </div>
                          <button onClick={() => handleDeleteStudent(batch.id, student.id)} className="text-red-600 hover:text-red-800 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="px-6 py-3 bg-gray-50 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    <Clock size={14} className="inline mr-1" />
                    Updated {new Date(batch.updatedAt).toLocaleDateString()}
                  </span>
                  <span className={`text-sm ${batch.students?.length > 0 ? 'text-green-600' : 'text-gray-600'}`}>
                    {batch.students?.length > 0 ? (
                      <CheckCircle size={16} className="inline mr-1" />
                    ) : (
                      <XCircle size={16} className="inline mr-1" />
                    )}
                    {batch.students?.length > 0 ? 'Active' : 'No Students'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h2 className="text-xl font-semibold text-gray-900">
                {selectedBatch ? 'Edit Batch' : 'Create New Batch'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Course Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g., Java Full Stack"
                    value={formData.course}
                    onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Batch Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g., March 24"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Allowed Radius (meters)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={formData.allowedRadius}
                    onChange={(e) => setFormData({ ...formData, allowedRadius: parseInt(e.target.value) || 100 })}
                    min="1"
                    required
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-4">
                <button 
                  type="button" 
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors" 
                  onClick={() => setShowModal(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? (
                    <>
                      <span className="spinner-border mr-2" /> Processing...
                    </>
                  ) : (
                    selectedBatch ? 'Update Batch' : 'Create Batch'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showStudentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Add New Student</h2>
              <button onClick={() => setShowStudentModal(false)} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleStudentSubmit} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Student Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={studentFormData.name}
                    onChange={(e) => setStudentFormData({ ...studentFormData, name: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                  <input
                    type="email"
                    className="form-control"
                    value={studentFormData.email}
                    onChange={(e) => setStudentFormData({ ...studentFormData, email: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    className="form-control"
                    value={studentFormData.phone}
                    onChange={(e) => setStudentFormData({ ...studentFormData, phone: e.target.value })}
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mode of Learning</label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="mode"
                        value="offline"
                        checked={studentFormData.mode === 'offline'}
                        onChange={(e) => setStudentFormData({ ...studentFormData, mode: e.target.value })}
                        className="mr-2"
                        disabled={loading}
                      />
                      <Building size={16} className="mr-1 text-gray-600" /> Offline
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="mode"
                        value="online"
                        checked={studentFormData.mode === 'online'}
                        onChange={(e) => setStudentFormData({ ...studentFormData, mode: e.target.value })}
                        className="mr-2"
                        disabled={loading}
                      />
                      <Monitor size={16} className="mr-1 text-gray-600" /> Online
                    </label>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-4">
                <button 
                  type="button" 
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors" 
                  onClick={() => setShowStudentModal(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  Add Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchManagement;