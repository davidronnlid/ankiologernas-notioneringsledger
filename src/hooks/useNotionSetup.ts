import { useState, useEffect } from 'react';

interface NotionSetupStatus {
  isSetup: boolean;
  isLoading: boolean;
  userName: string | null;
  error: string | null;
  needsReconfiguration?: boolean;
  message?: string | null;
}

export const useNotionSetup = (currentUser: any): NotionSetupStatus => {
  const [status, setStatus] = useState<NotionSetupStatus>({
    isSetup: false,
    isLoading: true,
    userName: null,
    error: null
  });

  useEffect(() => {
    const checkSetupStatus = async () => {
      if (!currentUser?.full_name) {
        setStatus({
          isSetup: false,
          isLoading: false,
          userName: null,
          error: 'Ingen användare inloggad'
        });
        return;
      }

      // Map user names to the format used in environment variables
      const mapUserNameToPerson = (fullName: string): string => {
        const nameLower = fullName.toLowerCase();
        
        // Special mapping for dronnlid -> David (matches other parts of codebase)
        if (nameLower.includes('dronnlid')) {
          return 'David';
        }
        
        const nameMappings: { [key: string]: string } = {
          'David Rönnlid': 'David',
          'Albin Otterhäll': 'Albin',
          'Mattias Hedström': 'Mattias',
          'David': 'David',
          'Albin': 'Albin', 
          'Mattias': 'Mattias'
        };
        
        return nameMappings[fullName] || fullName.split(' ')[0];
      };

      const userName = mapUserNameToPerson(currentUser.full_name);

      try {
        // Check if user has Notion integration configured
        const response = await fetch('/api/notion-setup-check-status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userName })
        });

        const result = await response.json();

        setStatus({
          isSetup: result.isSetup || false,
          isLoading: false,
          userName: userName,
          error: result.error || null,
          needsReconfiguration: result.needsReconfiguration || false,
          message: result.message || null
        });

      } catch (error) {
        console.error('Error checking Notion setup status:', error);
        setStatus({
          isSetup: false,
          isLoading: false,
          userName: userName,
          error: 'Kunde inte kontrollera Notion-status'
        });
      }
    };

    checkSetupStatus();
  }, [currentUser]);

  return status;
};