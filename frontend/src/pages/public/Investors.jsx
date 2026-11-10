import { Navigate } from "react-router-dom";

/**
 * Investor relations now live inside the Partners page so the header stays
 * uncluttered. The old URL keeps working for bookmarks and external links.
 */
export default function Investors() {
  return <Navigate to="/partners#investors" replace />;
}
