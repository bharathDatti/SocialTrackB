import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { 
  MapPin, 
  CheckCircle, 
  Users, 
  Calendar,
  Clock,
  BookOpen,
  AlertTriangle,
  Info,
  Smartphone,
  Wifi,
  WifiOff
} from 'lucide-react';
import { addAttendanceRecord } from '../../store/slices/attendanceSlice';
import { updateHistory } from '../../store/slices/scheduleSlice';
import { db } from '../../firebase/config';
import { collection, doc, getDoc, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

const getDeviceId = () => {
  const storedId = localStorage.getItem('deviceId');
  if (storedId) return storedId;
  
  // Enhanced device fingerprinting
  const userAgent = navigator.userAgent;
  const platform = navigator.platform;
  const screenResolution = `${window.screen.width}x${window.screen.height}`;
  const deviceId = btoa(`${userAgent}-${platform}-${screenResolution}-${Date.now()}`);
  
  localStorage.setItem('deviceId', deviceId);
  return deviceId;
};

const StudentAttendance = () => {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [batch, setBatch] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [hasMarkedAttendance, setHasMarkedAttendance] = useState(false);
  const [deviceId] = useState(getDeviceId());
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [locationAccuracy, setLocationAccuracy] = useState(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const fetchBatchDetails = async () => {
      try {
        if (!batchId) {
          navigate('/404');
          return;
        }

        const batchRef = doc(db, 'batches', batchId);
        const batchDoc = await getDoc(batchRef);
        
        if (!batchDoc.exists()) {
          navigate('/404');
          return;
        }

        const batchData = { id: batchDoc.id, ...batchDoc.data() };
        setBatch(batchData);

        // Check for existing attendance
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
        const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

        const attendanceQuery = query(
          collection(db, 'attendance'),
          where('batchId', '==', batchId),
          where('date', '>=', startOfDay),
          where('date', '<=', endOfDay),
          where('deviceId', '==', deviceId)
        );

        const attendanceSnapshot = await getDocs(attendanceQuery);
        if (!attendanceSnapshot.empty) {
          setHasMarkedAttendance(true);
        }
      } catch (error) {
        console.error('Error fetching batch details:', error);
        toast.error('Error loading batch details');
        navigate('/404');
      } finally {
        setLoading(false);
      }
    };

    fetchBatchDetails();
  }, [batchId, deviceId, navigate]);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }

    setIsGettingLocation(true);
    setLocationError(null);

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setLocationAccuracy(position.coords.accuracy);
        setIsGettingLocation(false);
        toast.success('Location acquired successfully');
      },
      (error) => {
        console.error('Geolocation error:', error);
        setLocationError(getLocationErrorMessage(error.code));
        setIsGettingLocation(false);
      },
      options
    );
  };

  const getLocationErrorMessage = (code) => {
    switch (code) {
      case 1: return 'Please allow location access to mark attendance';
      case 2: return 'Unable to determine your location. Please try again';
      case 3: return 'Location request timed out. Please try again';
      default: return 'Error getting location. Please try again';
    }
  };

  const areLocationsClose = (loc1, loc2, threshold = 0.0001) => {
    const latDiff = Math.abs(loc1.lat - loc2.lat);
    const lngDiff = Math.abs(loc1.lng - loc2.lng);
    return latDiff < threshold && lngDiff < threshold;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isOnline) {
      toast.error('Please check your internet connection');
      return;
    }

    if (!selectedStudent) {
      toast.error('Please select your name');
      return;
    }

    if (!location) {
      toast.error('Please enable location access');
      return;
    }

    if (locationAccuracy && locationAccuracy > 100) {
      toast.error('Location accuracy is too low. Please try again in a better location');
      return;
    }

    setSubmitting(true);
    try {
      const student = JSON.parse(selectedStudent);
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

      const attendanceQuery = query(
        collection(db, 'attendance'),
        where('batchId', '==', batchId),
        where('date', '>=', startOfDay),
        where('date', '<=', endOfDay),
        where('deviceId', '==', deviceId)
      );

      const attendanceSnapshot = await getDocs(attendanceQuery);
      const todayRecords = attendanceSnapshot.docs.map(doc => doc.data());
      
      const studentRecord = todayRecords.find(record => record.studentId === student.id);
      if (studentRecord) {
        toast.error('You have already marked attendance today');
        setSubmitting(false);
        return;
      }

      const otherStudentRecord = todayRecords.find(record => 
        record.studentId !== student.id && 
        areLocationsClose(record.location, location)
      );
      if (otherStudentRecord) {
        toast.error('Another student has already marked attendance from this location today');
        setSubmitting(false);
        return;
      }

      const timestamp = serverTimestamp();
      const attendanceData = {
        batchId,
        batchName: batch.name,
        studentId: student.id,
        studentName: student.name,
        date: today.toISOString(),
        status: 'present',
        location: location,
        locationAccuracy: locationAccuracy,
        mode: student.mode || 'offline',
        deviceId,
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          screenResolution: `${window.screen.width}x${window.screen.height}`,
          isMobile: /Mobile|Android|iOS/.test(navigator.userAgent)
        },
        timestamp
      };

      const docRef = await addDoc(collection(db, 'attendance'), attendanceData);
      
      const recordForRedux = {
        ...attendanceData,
        id: docRef.id,
        timestamp: Date.now()
      };

      dispatch(addAttendanceRecord(recordForRedux));
      dispatch(updateHistory(recordForRedux));

      setHasMarkedAttendance(true);
      toast.success('Attendance marked successfully!');
    } catch (error) {
      console.error('Error marking attendance:', error);
      toast.error('Error marking attendance. Please try again');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center p-4">
        <div className="spinner-border text-primary-600" role="status">
          <span className="sr-only">Loading...</span>
        </div>
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center p-4">
        <div className="bg-white rounded-lg shadow-md p-6 max-w-md w-full">
          <div className="text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Link</h2>
            <p className="text-gray-600">The attendance link is invalid or has expired.</p>
          </div>
        </div>
      </div>
    );
  }

  if (hasMarkedAttendance) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Attendance Recorded!</h2>
            <p className="text-gray-600 mb-6">Thank you for marking your attendance.</p>
            <div className="border-t border-gray-200 pt-4">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Batch:</span>
                <span className="font-medium">{batch.name}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 mt-2">
                <span>Date:</span>
                <span className="font-medium">{format(new Date(), 'PPP')}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 mt-2">
                <span>Time:</span>
                <span className="font-medium">{format(new Date(), 'p')}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 mt-2">
                <span>Location:</span>
                <span className="font-medium">{`${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`}</span>
              </div>
              {locationAccuracy && (
                <div className="flex justify-between text-sm text-gray-600 mt-2">
                  <span>Accuracy:</span>
                  <span className="font-medium">{`±${Math.round(locationAccuracy)}m`}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4">
            <h1 className="text-xl font-bold text-white">Mark Attendance</h1>
            <p className="text-white/80 mt-1">Please fill in your attendance details</p>
          </div>

          {!isOnline && (
            <div className="bg-red-50 p-4 flex items-center">
              <WifiOff className="text-red-500 mr-2" size={20} />
              <p className="text-red-700">You are offline. Please check your internet connection.</p>
            </div>
          )}

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <BookOpen className="text-primary-600 mr-2" size={20} />
                  <h3 className="font-medium">Course</h3>
                </div>
                <p className="text-gray-600">{batch.course}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <Users className="text-primary-600 mr-2" size={20} />
                  <h3 className="font-medium">Batch</h3>
                </div>
                <p className="text-gray-600">{batch.name}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <Calendar className="text-primary-600 mr-2" size={20} />
                  <h3 className="font-medium">Date</h3>
                </div>
                <p className="text-gray-600">{format(new Date(), 'PPP')}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <Clock className="text-primary-600 mr-2" size={20} />
                  <h3 className="font-medium">Time</h3>
                </div>
                <p className="text-gray-600">{format(new Date(), 'p')}</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Your Name
                </label>
                <select
                  className="form-control"
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  required
                >
                  <option value="">Choose your name</option>
                  {batch?.students?.map(student => (
                    <option key={student.id} value={JSON.stringify(student)}>
                      {student.name} ({student.rollNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Location Access
                  </label>
                  <button
                    type="button"
                    className={`inline-flex items-center px-3 py-1.5 border border-primary-600 text-primary-600 hover:bg-primary-50 rounded-lg text-sm font-medium transition-colors ${
                      isGettingLocation ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    onClick={getCurrentLocation}
                    disabled={isGettingLocation}
                  >
                    <MapPin size={16} className="mr-2" />
                    {isGettingLocation ? 'Getting Location...' : 'Get Current Location'}
                  </button>
                </div>

                {locationError && (
                  <div className="mt-2 p-3 bg-red-50 border-l-4 border-red-500 rounded-md">
                    <div className="flex">
                      <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                      <p className="text-sm text-red-700">{locationError}</p>
                    </div>
                  </div>
                )}

                {location && (
                  <div className="mt-2 p-3 bg-green-50 border-l-4 border-green-500 rounded-md">
                    <div className="flex flex-col">
                      <div className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                        <p className="text-sm text-green-700">
                          Location acquired: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                        </p>
                      </div>
                      {locationAccuracy && (
                        <p className="text-sm text-green-700 mt-1 ml-7">
                          Accuracy: ±{Math.round(locationAccuracy)}m
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-2 p-3 bg-blue-50 border-l-4 border-blue-500 rounded-md">
                  <div className="flex">
                    <Info className="h-5 w-5 text-blue-500 mr-2" />
                    <div className="text-sm text-blue-700">
                      <p>Important Notes:</p>
                      <ul className="list-disc list-inside mt-1 ml-2">
                        <li>Attendance can only be marked once per day</li>
                        <li>Location services must be enabled</li>
                        <li>Stable internet connection required</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className={`w-full btn ${
                  location && isOnline ? 'btn-primary' : 'bg-gray-300 cursor-not-allowed'
                }`}
                disabled={submitting || !location || !selectedStudent || isGettingLocation || !isOnline}
              >
                {submitting ? (
                  <>
                    <span className="spinner-border mr-2" />
                    Marking Attendance...
                  </>
                ) : (
                  <>
                    <Smartphone className="w-5 h-5 mr-2" />
                    Mark Attendance
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentAttendance;