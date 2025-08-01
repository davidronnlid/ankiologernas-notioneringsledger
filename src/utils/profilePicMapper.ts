/**
 * Get the profile picture URL based on a user's full name.
 * @param {string} fullName - The full name of the user.
 * @returns {string} - The URL of the profile picture.
 */
export function getProfilePicUrl(fullName: string): string {
  // Define an index signature for the object
  const nameToPicMap: { [key: string]: string } = {
    "Mattias Österdahl": "/images/mattias.png",
    "David Rönnlid": "/images/david.png",
    "Albin Lindberg": "/images/albin.png",
    // Support for first names only (used in celebrations)
    "Mattias": "/images/mattias.png",
    "David": "/images/david.png", 
    "Albin": "/images/albin.png",
    // Add more mappings as needed
  };

  // Check for special username mappings (like dronnlid -> David)
  const lowerName = fullName.toLowerCase();
  if (lowerName.includes('dronnlid')) {
    return "/images/david.png";
  }

  // Use the name to get the corresponding picture URL or return a default picture URL.
  return nameToPicMap[fullName] || "/images/alt_logo.png";
}
