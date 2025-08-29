import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase/client';

const VerificationStatus = ({ email }: { email: string }) => {
    const [isVerified, setIsVerified] = useState<boolean | null>(null);

    useEffect(() => {
        const fetchStatus = async () => {
            const { data, error } = await supabase
                .from('tutor_information')
                .select('is_verified')
                .eq('email', email)
                .single();
            if (error || !data) {
                setIsVerified(null);
            } else {
                setIsVerified(!!data.is_verified);
            }
        };
        fetchStatus();
    }, [email]);

    if (isVerified === null) return <span>Loading...</span>;
    if (isVerified) return <span className="px-2 py-1 bg-green-100 text-green-700 rounded">Verified</span>;
    return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded">Not Verified</span>;
};

export default VerificationStatus;
