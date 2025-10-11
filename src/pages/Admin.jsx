import { useNavigate } from 'react-router-dom';
import AdminOutfitUpload from '../components/AdminOutfitUpload';

const Admin = () => {
  const navigate = useNavigate();

  return (
    <AdminOutfitUpload onClose={() => navigate('/')} />
  );
};

export default Admin;
