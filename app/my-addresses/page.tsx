'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, Check, Home, Briefcase, MapPin, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

type Address = {
  _id: string;
  addressId: string;
  label: 'Home' | 'Work' | 'Other';
  name: string;
  phone: string;
  address: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
};

export default function MyAddressesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

  useEffect(() => {
    if (user) fetchAddresses();
  }, [user]);

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/address?userId=${user?._id}`);
      const data = await response.json();
      if (response.ok) {
        setAddresses(data.data || []);
      } else {
        throw new Error(data.message || 'Failed to load addresses');
      }
    } catch (error) {
      toast.error('Failed to load addresses');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (addressId: string) => {
    if (!confirm('Delete this address permanently?')) return;

    try {
      setDeletingId(addressId);
      const res = await fetch('/api/address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id: addressId }),
      });

      if (res.ok) {
        toast.success('Address deleted successfully');
        fetchAddresses();
      } else {
        const data = await res.json();
        toast.error(data.message || 'Failed to delete');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setDeletingId(null);
    }
  };

  const setAsDefault = async (addressId: string) => {
    try {
      setSettingDefaultId(addressId);
      const res = await fetch('/api/address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setdefault', id: addressId }),
      });

      if (res.ok) {
        toast.success('Default address updated');
        setAddresses(prev =>
          prev.map(a => ({ ...a, isDefault: a.addressId === addressId }))
        );
      } else {
        const data = await res.json();
        toast.error(data.message || 'Failed to update');
      }
    } catch {
      toast.error('Failed to update');
    } finally {
      setSettingDefaultId(null);
    }
  };

  const getLabelIcon = (label: string) => {
    switch (label) {
      case 'Home': return <Home className="w-5 h-5" />;
      case 'Work': return <Briefcase className="w-5 h-5" />;
      default: return <MapPin className="w-5 h-5" />;
    }
  };

  const getLabelStyle = (label: string) => {
    switch (label) {
      case 'Home': return 'bg-green-100 text-green-800 border-green-300';
      case 'Work': return 'bg-amber-100 text-amber-800 border-amber-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Add New Address Button */}
        <div className="flex justify-end mb-12">
          <Button
            onClick={() => router.push('/my-addresses/add')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all text-lg flex items-center gap-3"
          >
            <Plus className="w-4 h-4" />
            Add New Address
          </Button>
        </div>

        {/* Empty State */}
        {addresses.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-16 text-center max-w-2xl mx-auto border border-green-100">
            <div className="w-32 h-32 bg-emerald-100 rounded-full mx-auto mb-8 flex items-center justify-center">
              <MapPin className="w-16 h-16 text-emerald-600" />
            </div>
            <h3 className="text-3xl font-bold text-gray-800 mb-4">
              No addresses saved yet
            </h3>
            <p className="text-gray-600 text-lg mb-10">
              Add your first delivery address to make shopping faster
            </p>
            <Button
              onClick={() => router.push('/my-addresses/add')}
              size="lg"
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-12 py-7 rounded-2xl text-xl font-bold shadow-lg"
            >
              <Plus className="mr-3 h-7 w-7" />
              Add Your First Address
            </Button>
          </div>
        ) : (          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {addresses.map((addr) => (
              <div
                key={addr.addressId}
                className={`relative bg-white rounded-3xl shadow-xl overflow-hidden transition-all duration-500 hover:shadow-2xl hover:-translate-y-4 border-4 ${
                  addr.isDefault 
                    ? 'border-emerald-500 ring-8 ring-emerald-100' 
                    : 'border-transparent'
                }`}
              >
                {/* Default Badge */}
                {addr.isDefault && (
                  <div className="absolute top-0 right-0 bg-gradient-to-l from-emerald-600 to-green-600 text-white px-10 py-3 rounded-bl-3xl font-bold text-sm tracking-wider flex items-center gap-2 shadow-lg">
                    <Check className="w-5 h-5" />
                    DEFAULT ADDRESS
                  </div>
                )}

                <div className="p-8">
                  {/* Label Badge */}
                  <div className="mb-6">
                    <span className={`inline-flex items-center gap-3 px-6 py-3 rounded-2xl font-bold text-sm border-2 ${getLabelStyle(addr.label)}`}>
                      {getLabelIcon(addr.label)}
                      {addr.label}
                    </span>
                  </div>

                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{addr.name}</h3>
                  <p className="text-lg font-semibold text-gray-700 mb-5">+91 {addr.phone}</p>

                  <div className="space-y-3 text-gray-700">
                    <p className="font-medium leading-relaxed">{addr.address}</p>
                    {addr.landmark && (
                      <p className="text-sm text-gray-500 italic">Near {addr.landmark}</p>
                    )}
                    <p className="text-lg font-bold text-emerald-700">
                      {addr.city}, {addr.state} - {addr.pincode}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-8 pt-6 border-t-2 border-green-100 flex gap-4">
                    <Button
                      variant="outline"
                      onClick={() => router.push(`/my-addresses/edit/${addr.addressId}`)}
                      className="flex-1 py-5 text-lg font-medium rounded-2xl border-2 border-gray-300 hover:bg-gray-50"
                    >
                      <Edit className="mr-2 h-5 w-5" /> Edit
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => handleDelete(addr.addressId)}
                      disabled={deletingId === addr.addressId}
                      className="flex-1 py-5 text-lg font-medium rounded-2xl border-2 border-red-300 text-red-600 hover:bg-red-50"
                    >
                      {deletingId === addr.addressId ? (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      ) : (
                        <Trash2 className="mr-2 h-5 w-5" />
                      )}
                      {deletingId === addr.addressId ? 'Deleting...' : 'Delete'}
                    </Button>

                    {!addr.isDefault && (
                      <Button
                        onClick={() => setAsDefault(addr.addressId)}
                        disabled={settingDefaultId === addr.addressId}
                        className="flex-1 py-5 text-lg font-bold rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
                      >
                        {settingDefaultId === addr.addressId ? (
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        ) : (
                          <Check className="mr-2 h-5 w-5" />
                        )}
                        Set Default
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// 'use client';

// import { useEffect, useState } from 'react';
// import { useRouter } from 'next/navigation';
// import { useAuth } from '@/context/AuthContext';
// import { Button } from '@/components/ui/button';
// import { Plus, Edit, Trash2, Check } from 'lucide-react';
// import { toast } from 'react-hot-toast';

// type Address = {
//   _id: string;
//   addressId: string;
//   label: 'Home' | 'Work' | 'Other';
//   name: string;
//   phone: string;
//   address: string;
//   landmark?: string;
//   city: string;
//   state: string;
//   pincode: string;
//   isDefault: boolean;
// };

// export default function MyAddressesPage() {
//   const { user } = useAuth();
//   const router = useRouter();
//   const [addresses, setAddresses] = useState<Address[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [deletingId, setDeletingId] = useState<string | null>(null);
//   const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

//   useEffect(() => {
//     if (user) {
//       fetchAddresses();
//     }
//   }, [user]);

//   const fetchAddresses = async () => {
//     try {
//       setLoading(true);
//       const response = await fetch(`/api/address?userId=${user?._id}`);
//       const data = await response.json();
      
//       if (response.ok) {
//         setAddresses(data.data);
//       } else {
//         throw new Error(data.message || 'Failed to fetch addresses');
//       }
//     } catch (error) {
//       console.error('Error fetching addresses:', error);
//       toast.error('Failed to load addresses');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleDelete = async (addressId: string) => {
//     if (!window.confirm('Are you sure you want to delete this address?')) return;
    
//     try {
//       setDeletingId(addressId);
//       const response = await fetch('/api/address', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           action: 'delete',
//           id: addressId,
//         }),
//       });
      
//       const data = await response.json();
      
//       if (response.ok) {
//         toast.success('Address deleted successfully');
//         fetchAddresses();
//       } else {
//         throw new Error(data.message || 'Failed to delete address');
//       }
//     } catch (error) {
//       console.error('Error deleting address:', error);
//       toast.error('Failed to delete address');
//     } finally {
//       setDeletingId(null);
//     }
//   };

//   const setAsDefault = async (addressId: string) => {
//     try {
//       setSettingDefaultId(addressId);
//       const response = await fetch('/api/address', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           action: 'setdefault',
//           id: addressId,
//         }),
//       });
      
//       const data = await response.json();
      
//       if (response.ok) {
//         toast.success('Default address updated');
//         fetchAddresses();
//       } else {
//         throw new Error(data.message || 'Failed to update default address');
//       }
//     } catch (error) {
//       console.error('Error setting default address:', error);
//       toast.error('Failed to update default address');
//     } finally {
//       setSettingDefaultId(null);
//     }
//   };

//   if (loading) {
//     return (
//       <div className="container mx-auto px-4 py-8">
//         <div className="text-center">Loading addresses...</div>
//       </div>
//     );
//   }

//   return (
//     <div className="container mx-auto px-4 py-8">
//       <div className="flex justify-between items-center mb-6">
//         <h1 className="text-2xl font-bold"></h1>
//         <Button onClick={() => router.push('/my-addresses/add')}>
//           <Plus className="mr-2 h-4 w-4" /> Add New Address
//         </Button>
//       </div>

//       {addresses.length === 0 ? (
//         <div className="text-center py-12">
//           <p className="text-gray-500 mb-4">You haven't added any addresses yet.</p>
//           <Button onClick={() => router.push('/my-addresses/add')}>
//             Add Your First Address
//           </Button>
//         </div>
//       ) : (
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//           {addresses.map((address) => (
//             <div 
//               key={address.addressId} 
//               className={`border rounded-lg p-6 relative ${address.isDefault ? 'border-primary border-2' : 'border-gray-200'}`}
//             >
//               {address.isDefault && (
//                 <span className="absolute top-2 right-2 bg-primary text-white text-xs px-2 py-1 rounded">
//                   Default
//                 </span>
//               )}
//               <div className="flex items-start justify-between mb-2">
//                 <h3 className="font-medium">
//                   {address.label} • {address.name}
//                 </h3>
//               </div>
//               <p className="text-gray-600 mb-2">{address.address}</p>
//               {address.landmark && <p className="text-gray-500 text-sm mb-2">Landmark: {address.landmark}</p>}
//               <p className="text-gray-600">
//                 {address.city}, {address.state} - {address.pincode}
//               </p>
//               <p className="text-gray-600 mt-2">Phone: {address.phone}</p>
              
//               <div className="flex justify-between mt-4 pt-4 border-t">
//                 <div className="space-x-2">
//                   <Button 
//                     variant="outline" 
//                     size="sm" 
//                     onClick={() => router.push(`/my-addresses/edit/${address.addressId}`)}
//                   >
//                     <Edit className="h-4 w-4 mr-1" /> Edit
//                   </Button>
//                   <Button 
//                     variant="outline" 
//                     size="sm" 
//                     onClick={() => handleDelete(address.addressId)}
//                     disabled={deletingId === address.addressId}
//                   >
//                     <Trash2 className="h-4 w-4 mr-1" />
//                     {deletingId === address.addressId ? 'Deleting...' : 'Delete'}
//                   </Button>
//                 </div>
//                 {!address.isDefault && (
//                   <Button 
//                     variant="outline" 
//                     size="sm"
//                     onClick={() => setAsDefault(address.addressId)}
//                     disabled={settingDefaultId === address.addressId}
//                   >
//                     <Check className="h-4 w-4 mr-1" />
//                     {settingDefaultId === address.addressId ? 'Saving...' : 'Set as Default'}
//                   </Button>
//                 )}
//               </div>
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }
