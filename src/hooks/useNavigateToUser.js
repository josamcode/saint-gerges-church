import { useNavigate } from "react-router-dom";

const useNavigateToUser = () => {
  const navigate = useNavigate();

  const navigateToUser = (id) => {
    navigate(`/dashboard/users/${id}`);
  };

  return navigateToUser;
};

export default useNavigateToUser;
