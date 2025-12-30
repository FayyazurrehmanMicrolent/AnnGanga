'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { FiUser, FiMail, FiPhone, FiMapPin, FiCalendar, FiSave, FiCamera } from 'react-icons/fi';
import { FaArrowLeft } from 'react-icons/fa';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function EditProfile() {
  const { user, token } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    dob: '',
  });

  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        dob: (user as any).dob ? new Date((user as any).dob).toISOString().split('T')[0] : '',
      });
      setProfileImage(user.profileImage || null);
      setIsLoading(false);
    }
  }, [user]);

  // Redirect if not logged in
  useEffect(() => {
    if (!user && !isLoading) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem('authToken');
      if (!token || !user?._id) throw new Error('Authentication required');

      const formDataToSend = new FormData();
      
      // Append text data
      formDataToSend.append('data', JSON.stringify({
        userId: user._id,
        name: formData.name,
        dob: formData.dob || undefined,
      }));

      // Append image if changed
      if (imageFile) {
        formDataToSend.append('profileImage', imageFile);
      }

      const { default: fetchWithDefaults } = await import('@/lib/fetchClient');
      const response = await fetchWithDefaults('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formDataToSend,
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Update failed');

      toast.success('Profile updated successfully!');
      setTimeout(() => window.location.reload(), 1000);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
      if (error.message.toLowerCase().includes('token')) router.push('/login');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-10">
          <button
            onClick={() => router.back()}
            className="p-3 bg-white rounded-full shadow-md hover:shadow-lg transition-all hover:scale-110"
          >
            <FaArrowLeft className="text-xl text-gray-700" />
          </button>
          <h1 className="text-2xl font-bold text-green-600 ">
            Edit Profile
          </h1>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Profile Picture Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl shadow-xl p-8 text-center sticky top-8">
              <div className="relative inline-block">
                <div className="w-48 h-48 mx-auto rounded-full overflow-hidden border-4 border-indigo-100 shadow-2xl">
                  {profileImage ? (
                    <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-200 to-blue-300 flex items-center justify-center">
                      <FiUser className="text-6xl text-white opacity-80" />
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-4 right-4 bg-green-600 text-white p-4 rounded-full shadow-lg hover:scale-110 transition-all"
                >
                  <FiCamera className="text-xl" />
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>

              <h2 className="mt-6 text-2xl font-bold text-gray-800">{formData.name || 'Your Name'}</h2>
              <p className="text-gray-500">{formData.email}</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 text-green-600 font-semibold hover:text-green-800 transition"
              >
                Change Profile Picture
              </button>
            </div>
          </div>

          {/* Form Card - Two Columns */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-xl p-8 lg:p-10">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Name */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <FiUser className="text-green-600" /> Full Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-4 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all outline-none text-gray-800"
                    placeholder="John Doe"
                    required
                  />
                </div>

                {/* Email (Read-only) */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <FiMail className="text-green-600" /> Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    readOnly
                    className="w-full px-4 py-4 rounded-xl border border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed"
                  />
                </div>

                {/* Phone (Read-only) */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <FiPhone className="text-green-600" /> Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    readOnly
                    className="w-full px-4 py-4 rounded-xl border border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed"
                  />
                </div>

                {/* Date of Birth */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <FiCalendar className="text-green-600" /> Date of Birth
                  </label>
                  <input
                    type="date"
                    name="dob"
                    value={formData.dob}
                    onChange={handleChange}
                    className="w-full px-4 py-4 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="mt-10">
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold text-lg py-5 rounded-2xl shadow-lg hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-3"
                >
                  <FiSave className="text-xl" />
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}


// 'use client';

// import { useState, useEffect } from 'react';
// import { toast } from 'react-hot-toast';
// import { FiUser, FiMail, FiPhone, FiMapPin, FiCalendar, FiSave } from 'react-icons/fi';
// import { FaArrowLeft } from 'react-icons/fa';
// import { useAuth } from '@/context/AuthContext';
// import { useRouter } from 'next/navigation';

// export default function EditProfile() {
//   const { user, token } = useAuth();
//   const router = useRouter();
  
//   const [formData, setFormData] = useState({
//     name: '',
//     email: '',
//     phone: '',
//     address: '',
//     dob: '',
//   });
//   const [isLoading, setIsLoading] = useState(true);

//   // Set initial form data when user data is available
//   useEffect(() => {
//     if (user) {
//       // Safely access optional properties with fallbacks
//       setFormData(prev => ({
//         ...prev,
//         name: user.name || '',
//         email: user.email || '',
//         phone: user.phone || '',
//         // Use type assertion to handle potentially undefined properties
//         ...(user as any).address && { address: (user as any).address },
//         ...(user as any).dob && { 
//           dob: new Date((user as any).dob).toISOString().split('T')[0] 
//         },
//       }));
//       setIsLoading(false);
//     }
//   }, [user]);

//   // Redirect to login if not authenticated
//   useEffect(() => {
//     if (!user && !isLoading) {
//       router.push('/login');
//     }
//   }, [user, isLoading, router]);

//   const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const { name, value } = e.target;
//     setFormData(prev => ({
//       ...prev,
//       [name]: value
//     }));
//   };

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
    
//     try {
//       // Get the auth token from localStorage
//       const token = localStorage.getItem('authToken');
      
//       if (!token) {
//         throw new Error('Authentication token not found. Please log in again.');
//       }

//       if (!user?._id) {
//         throw new Error('User ID not found. Please log in again.');
//       }

//       // Create the update data object
//       const updateData = {
//         name: formData.name,
//         ...(formData.address && { address: formData.address }),
//         ...(formData.dob && { dob: formData.dob })
//       };

//       // Create FormData to handle both file uploads and regular fields
//       const formDataToSend = new FormData();
//       formDataToSend.append('data', JSON.stringify({
//         ...updateData,
//         userId: user._id
//       }));

//       // Send the request with FormData
//       const response = await fetch('/api/auth/update-profile', {
//         method: 'POST',
//         headers: {
//           'Authorization': `Bearer ${token}`
//           // Let the browser set the Content-Type with boundary
//         },
//         body: formDataToSend,
//       });

//       const responseData = await response.json();
      
//       if (!response.ok) {
//         throw new Error(responseData.message || 'Failed to update profile');
//       }
      
//       // Show success message
//       toast.success('Profile updated successfully!');
      
//       // Force a page refresh to update the user data
//       window.location.reload();
      
//     } catch (error: any) {
//       console.error('Error updating profile:', error);
//       toast.error(error.message || 'Failed to update profile. Please try again.');
      
//       // Redirect to login if token is invalid
//       if (error.message.includes('token') || error.message.includes('authenticat')) {
//         router.push('/login');
//       }
//     }
//   };

//   if (isLoading) {
//     return (
//       <div className="min-h-screen bg-gray-50 flex items-center justify-center">
//         <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
//       <div className="max-w-2xl mx-auto">
//         {/* Header */}
//         <div className="flex items-center mb-8">
//           <button 
//             onClick={() => router.back()}
//             className="mr-4 text-gray-600 hover:text-gray-800"
//           >
//             <FaArrowLeft size={20} />
//           </button>
//           <h1 className="text-2xl font-bold text-gray-800">Edit Profile</h1>
//         </div>

//         {/* Profile Picture Section */}
//         <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
//           <div className="flex flex-col items-center">
//             <div className="relative mb-4">
//               {user?.profileImage ? (
//                 <div className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden">
//                   <img 
//                     src={user.profileImage} 
//                     alt={user.name || 'Profile'} 
//                     className="w-full h-full object-cover"
//                   />
//                 </div>
//               ) : (
//                 <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
//                   <FiUser className="w-12 h-12 text-gray-400" />
//                 </div>
//               )}
//               <button className="absolute bottom-0 right-0 bg-blue-500 text-white rounded-full p-2 hover:bg-blue-600 transition-colors">
//                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
//                 </svg>
//               </button>
//             </div>
//             <button className="text-blue-500 font-medium">Change Profile Picture</button>
//           </div>
//         </div>

//         {/* Form Section */}
//         <form onSubmit={handleSubmit} className="space-y-6">
//           <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
//             {/* Name Field */}
//             <div className="space-y-1">
//               <label className="text-sm font-medium text-gray-700">Name</label>
//               <div className="relative">
//                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
//                   <FiUser className="h-5 w-5 text-gray-400" />
//                 </div>
//                 <input
//                   type="text"
//                   name="name"
//                   value={formData.name}
//                   onChange={handleChange}
//                   className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//                   placeholder="Enter your name"
//                 />
//               </div>
//             </div>

//             {/* Email Field - Read Only */}
//             <div className="space-y-1">
//               <label className="text-sm font-medium text-gray-700">Email</label>
//               <div className="relative">
//                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
//                   <FiMail className="h-5 w-5 text-gray-400" />
//                 </div>
//                 <input
//                   type="email"
//                   name="email"
//                   value={formData.email}
//                   readOnly
//                   className="block w-full pl-10 pr-3 py-3 border border-gray-200 bg-gray-50 rounded-xl text-gray-500 cursor-not-allowed"
//                   placeholder="Email"
//                 />
//               </div>
//             </div>

//             {/* Phone Field - Read Only */}
//             <div className="space-y-1">
//               <label className="text-sm font-medium text-gray-700">Phone</label>
//               <div className="relative">
//                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
//                   <FiPhone className="h-5 w-5 text-gray-400" />
//                 </div>
//                 <input
//                   type="tel"
//                   name="phone"
//                   value={formData.phone}
//                   readOnly
//                   className="block w-full pl-10 pr-3 py-3 border border-gray-200 bg-gray-50 rounded-xl text-gray-500 cursor-not-allowed"
//                   placeholder="Phone number"
//                 />
//               </div>
//             </div>

//             {/* Address Field */}
//             <div className="space-y-1">
//               <label className="text-sm font-medium text-gray-700">Address</label>
//               <div className="relative">
//                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
//                   <FiMapPin className="h-5 w-5 text-gray-400" />
//                 </div>
//                 <input
//                   type="text"
//                   name="address"
//                   value={formData.address}
//                   onChange={handleChange}
//                   className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//                   placeholder="Enter your address"
//                 />
//               </div>
//             </div>

//             {/* Date of Birth Field */}
//             <div className="space-y-1">
//               <label className="text-sm font-medium text-gray-700">Date of Birth</label>
//               <div className="relative">
//                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
//                   <FiCalendar className="h-5 w-5 text-gray-400" />
//                 </div>
//                 <input
//                   type="date"
//                   name="dob"
//                   value={formData.dob}
//                   onChange={handleChange}
//                   className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700"
//                 />
//               </div>
//             </div>
//           </div>

//           {/* Save Button */}
//           <div className="pt-4">
//             <button
//               type="submit"
//               className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-6 rounded-xl font-medium text-lg hover:opacity-90 transition-opacity flex items-center justify-center space-x-2"
//             >
//               <FiSave className="h-5 w-5" />
//               <span>Save Changes</span>
//             </button>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// }
