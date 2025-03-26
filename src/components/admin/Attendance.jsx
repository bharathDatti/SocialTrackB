import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  Users, 
  CheckCircle, 
  XCircle, 
  Calendar,
  Clock,
  Monitor,
  Building,
  Search,
  AlertCircle,
  Info,
  UserCheck,
  Smartphone,
  MapPin,
  RotateCw
} from 'lucide-react';
import { format, isValid, parseISO, subDays, isBefore, isAfter } from 'date-fns';
import { 
  addDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  serverTimestamp,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { 
  addAttendanceRecord, 
  fetchTodayAttendance as fetchTodayAttendanceAction,
  updateAttendanceStatus
} from '../../store/slices/attendanceSlice';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';

const Attendance = () => {
  const dispatch = useDispatch();
  const { batches } = useSelector(state => state.batches);
  const { todayRecords, loading: stateLoading } = useSelector(state => state.attendance);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [markingMode, setMarkingMode] = useState('individual');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [todayAttendance, setTodayAttendance] = useState({
    present: 0,
    absent: 0,
    adminMarked: 0,
    deviceMarked: 0,
    locationVerified: 0
  });

  const maxDate = format(new Date(), 'yyyy-MM-dd');
  const minDate = format(subDays(new Date(), 5), 'yyyy-MM-dd');

  const courses = [...new Set(batches?.map(batch => batch.course) || [])];
  const courseBatches = selectedCourse && batches 
    ? batches.filter(batch => batch.course === selectedCourse)
    : [];
  const selectedBatchData = batches?.find(batch => batch.id === selectedBatch);
  const batchStudents = selectedBatchData?.students || [];

  const filteredStudents = batchStudents.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.rollNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  useEffect(() => {
    if (selectedBatch) {
      dispatch(fetchTodayAttendanceAction(selectedBatch));
    }
  }, [selectedBatch, dispatch]);

  useEffect(() => {
    if (todayRecords.length > 0) {
      const present = todayRecords.filter(record => record.status === 'present').length;
      const absent = todayRecords.filter(record => record.status === 'absent').length;
      const adminMarked = todayRecords.filter(record => record.markedByAdmin).length;
      const deviceMarked = todayRecords.filter(record => record.deviceId).length;
      const locationVerified = todayRecords.filter(record => record.location?.lat && record.location?.lng).length;
      
      setTodayAttendance({ 
        present, 
        absent, 
        adminMarked,
        deviceMarked,
        locationVerified
      });
    } else {
      setTodayAttendance({
        present: 0,
        absent: 0,
        adminMarked: 0,
        deviceMarked: 0,
        locationVerified: 0
      });
    }
  }, [todayRecords]);

  const validateDate = (date) => {
    const selectedDateObj = parseISO(date);
    const minDateObj = parseISO(minDate);
    const maxDateObj = parseISO(maxDate);

    return isValid(selectedDateObj) && 
           !isBefore(selectedDateObj, minDateObj) && 
           !isAfter(selectedDateObj, maxDateObj);
  };

  const toggleAttendanceStatus = async (record) => {
    try {
      const newStatus = record.status === 'present' ? 'absent' : 'present';
      await dispatch(updateAttendanceStatus({ 
        attendanceId: record.id, 
        newStatus 
      })).unwrap();
      
      toast.success(`Attendance status updated to ${newStatus}`);
      dispatch(fetchTodayAttendanceAction(selectedBatch));
    } catch (error) {
      console.error('Error updating attendance status:', error);
      toast.error('Failed to update attendance status');
    }
  };

  const markAttendance = async (status) => {
    if (!selectedStudents.length || !selectedBatch || !selectedBatchData) {
      toast.error('Please select students and a valid batch');
      return;
    }

    if (!validateDate(selectedDate)) {
      toast.error('Please select a date within the last 5 days');
      return;
    }

    const result = await Swal.fire({
      title: 'Confirm Attendance',
      text: `Mark ${selectedStudents.length} student(s) as ${status}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: status === 'present' ? '#22c55e' : '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: `Mark ${status}`
    });

    if (!result.isConfirmed) return;

    setLoading(true);

    try {
      const attendanceDate = new Date(selectedDate);
      attendanceDate.setHours(new Date().getHours());
      attendanceDate.setMinutes(new Date().getMinutes());

      const attendancePromises = selectedStudents.map(async (student) => {
        if (!student || !student.id) return null;

        const existingRecord = todayRecords.find(record => 
          record.studentId === student.id && 
          format(new Date(record.date), 'yyyy-MM-dd') === selectedDate
        );

        const attendanceData = {
          batchId: selectedBatch,
          batchName: selectedBatchData.name,
          studentId: student.id,
          studentName: student.name,
          date: attendanceDate.toISOString(),
          status,
          mode: student.mode || 'offline',
          markedByAdmin: true,
          timestamp: serverTimestamp()
        };

        if (existingRecord) {
          // Update existing record via updateAttendanceStatus
          await dispatch(updateAttendanceStatus({ 
            attendanceId: existingRecord.id, 
            newStatus: status 
          })).unwrap();
          return { ...attendanceData, id: existingRecord.id };
        } else {
          // Add new record
          const docRef = await addDoc(collection(db, 'attendance'), attendanceData);
          return { ...attendanceData, id: docRef.id };
        }
      });

      const newRecords = (await Promise.all(attendancePromises)).filter(Boolean);
      
      newRecords.forEach(record => {
        dispatch(addAttendanceRecord(record));
      });

      setSelectedStudent('');
      setSelectedStudents([]);
      dispatch(fetchTodayAttendanceAction(selectedBatch));
      
      toast.success(`Attendance marked successfully for ${newRecords.length} student(s)`);
    } catch (error) {
      console.error('Error marking attendance:', error);
      toast.error('Failed to mark attendance. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCourseChange = (e) => {
    setSelectedCourse(e.target.value);
    setSelectedBatch('');
    setSelectedStudent('');
    setSelectedStudents([]);
    setTodayAttendance({
      present: 0,
      absent: 0,
      adminMarked: 0,
      deviceMarked: 0,
      locationVerified: 0
    });
  };

  const handleBatchChange = (e) => {
    const batchId = e.target.value;
    setSelectedBatch(batchId);
    setSelectedStudent('');
    setSelectedStudents([]);
    if (batchId) {
      dispatch(fetchTodayAttendanceAction(batchId));
    }
  };

  const handleStudentChange = (e) => {
    const studentId = e.target.value;
    const student = batchStudents.find(s => s.id === studentId);
    setSelectedStudent(studentId);
    if (student) {
      setSelectedStudents([student]);
    } else {
      setSelectedStudents([]);
    }
  };

  const handleStudentToggle = (student) => {
    if (!student) return;
    
    setSelectedStudents(prev => {
      const isSelected = prev.find(s => s.id === student.id);
      if (isSelected) {
        return prev.filter(s => s.id !== student.id);
      } else {
        return [...prev, student];
      }
    });
  };

  const handleSelectAll = () => {
    setSelectedStudents(filteredStudents);
  };

  const handleDeselectAll = () => {
    setSelectedStudents([]);
  };

  const getAttendanceIcon = (record) => {
    if (record.markedByAdmin) {
      return <UserCheck className="w-4 h-4 text-purple-500" title="Marked by Admin" />;
    }
    if (record.deviceId) {
      return <Smartphone className="w-4 h-4 text-amber-500" title="Marked via Device" />;
    }
    if (record.location?.lat && record.location?.lng) {
      return <MapPin className="w-4 h-4 text-emerald-500" title="Location Verified" />;
    }
    return null;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <Calendar className="mr-2" />
          Mark Attendance
        </h1>
        <p className="text-gray-600 mt-1">
          Mark or modify attendance for individual students or entire batches
        </p>
      </div>

      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-md">
        <div className="flex items-start">
          <Info className="text-yellow-400 mt-0.5 mr-3" />
          <div>
            <h3 className="text-sm font-medium text-yellow-800">Attendance Marking Restriction</h3>
            <p className="text-sm text-yellow-700">
              You can only mark/modify attendance for the last 5 days ({format(parseISO(minDate), 'MMM dd, yyyy')} to {format(parseISO(maxDate), 'MMM dd, yyyy')})
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Date
            </label>
            <input
              type="date"
              className="form-control"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={minDate}
              max={maxDate}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Course
            </label>
            <select
              className="form-control"
              value={selectedCourse}
              onChange={handleCourseChange}
            >
              <option value="">Choose a course</option>
              {courses.map(course => (
                <option key={course} value={course}>{course}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Batch
            </label>
            <select
              className="form-control"
              value={selectedBatch}
              onChange={handleBatchChange}
              disabled={!selectedCourse}
            >
              <option value="">Choose a batch</option>
              {courseBatches.map(batch => (
                <option key={batch.id} value={batch.id}>{batch.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Marking Mode
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="markingMode"
                  value="individual"
                  checked={markingMode === 'individual'}
                  onChange={(e) => {
                    setMarkingMode(e.target.value);
                    setSelectedStudents([]);
                  }}
                  className="mr-2"
                />
                Individual
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="markingMode"
                  value="batch"
                  checked={markingMode === 'batch'}
                  onChange={(e) => {
                    setMarkingMode(e.target.value);
                    if (selectedBatch) {
                      dispatch(fetchTodayAttendanceAction(selectedBatch));
                    }
                  }}
                  className="mr-2"
                />
                Batch
              </label>
            </div>
          </div>

          {markingMode === 'individual' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Student
              </label>
              <select
                className="form-control"
                value={selectedStudent}
                onChange={handleStudentChange}
                disabled={!selectedBatch}
              >
                <option value="">Choose a student</option>
                {filteredStudents.map(student => (
                  <option key={student.id} value={student.id}>
                    {student.name} ({student.rollNumber})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {markingMode === 'batch' && selectedBatch && (
          <>
            <div className="flex justify-between items-center mb-4">
              <div className="relative flex-grow max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search students..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <button
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                  onClick={handleSelectAll}
                >
                  Select All
                </button>
                <button
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                  onClick={handleDeselectAll}
                >
                  Deselect All
                </button>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto border rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Select
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Roll Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mode
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Current Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredStudents.map(student => {
                    const currentRecord = todayRecords.find(record => 
                      record.studentId === student.id && 
                      format(new Date(record.date), 'yyyy-MM-dd') === selectedDate
                    );
                    return (
                      <tr 
                        key={student.id}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedStudents.some(s => s.id === student.id)}
                            onChange={() => handleStudentToggle(student)}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {student.rollNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {student.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            student.mode === 'online'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-orange-100 text-orange-800'
                          }`}>
                            {student.mode === 'online' ? (
                              <Monitor className="w-4 h-4 mr-1" />
                            ) : (
                              <Building className="w-4 h-4 mr-1" />
                            )}
                            {student.mode.charAt(0).toUpperCase() + student.mode.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {currentRecord ? (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              currentRecord.status === 'present'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {getAttendanceIcon(currentRecord)}
                              {currentRecord.status.charAt(0).toUpperCase() + currentRecord.status.slice(1)}
                            </span>
                          ) : (
                            <span className="text-gray-500">Not Marked</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {currentRecord && (
                            <button
                              onClick={() => toggleAttendanceStatus(currentRecord)}
                              className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-medium ${
                                currentRecord.status === 'present'
                                  ? 'bg-red-100 text-red-800 hover:bg-red-200'
                                  : 'bg-green-100 text-green-800 hover:bg-green-200'
                              }`}
                            >
                              <RotateCw className="w-3 h-3 mr-1" />
                              Mark {currentRecord.status === 'present' ? 'Absent' : 'Present'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {selectedBatch && (
          <div className="mt-6 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {selectedStudents.length} student(s) selected for {format(parseISO(selectedDate), 'MMM dd, yyyy')}
            </div>
            
            <div className="flex gap-4">
              <button
                className="btn bg-red-600 text-white hover:bg-red-700 flex items-center gap-2"
                onClick={() => markAttendance('absent')}
                disabled={loading || selectedStudents.length === 0}
              >
                <XCircle size={20} />
                Mark Absent
              </button>
              <button
                className="btn bg-green-600 text-white hover:bg-green-700 flex items-center gap-2"
                onClick={() => markAttendance('present')}
                disabled={loading || selectedStudents.length === 0}
              >
                <CheckCircle size={20} />
                Mark Present
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedBatch && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Clock className="mr-2" />
            Attendance Summary for {format(parseISO(selectedDate), 'MMM dd, yyyy')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Users className="text-gray-500 mr-2" size={20} />
                  <span className="text-sm font-medium">Total Students</span>
                </div>
                <span className="text-lg font-bold text-gray-900">
                  {batchStudents.length}
                </span>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <CheckCircle className="text-green-500 mr-2" size={20} />
                  <span className="text-sm font-medium">Present</span>
                </div>
                <span className="text-lg font-bold text-green-600">
                  {todayAttendance.present}
                </span>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <XCircle className="text-red-500 mr-2" size={20} />
                  <span className="text-sm font-medium">Absent</span>
                </div>
                <span className="text-lg font-bold text-red-600">
                  {todayAttendance.absent}
                </span>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <AlertCircle className="text-orange-500 mr-2" size={20} />
                  <span className="text-sm font-medium">Pending</span>
                </div>
                <span className="text-lg font-bold text-orange-600">
                  {batchStudents.length - (todayAttendance.present + todayAttendance.absent)}
                </span>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <UserCheck className="text-purple-500 mr-2" size={20} />
                  <span className="text-sm font-medium">Admin Marked</span>
                </div>
                <span className="text-lg font-bold text-purple-600">
                  {todayAttendance.adminMarked}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;