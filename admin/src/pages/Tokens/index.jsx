import React, { useState, useEffect } from 'react';
import { 
  Main, 
  Typography, 
  Box, 
  Flex, 
  Button, 
  Loader, 
  EmptyStateLayout,
  Table,
  Thead,
  Tbody,
  Tr,
  Td,
  Th,
  Badge,
  Divider,
  Link,
  Tooltip,
  Checkbox,
  TextInput,
  Modal,
  Field,
  useField,
  Grid,
} from '@strapi/design-system';
import { useFetchClient, useNotification, useFetchClient as useFetchClientHelper } from '@strapi/strapi/admin';
import { 
  Information, 
  ArrowLeft, 
  Plus, 
  Cross, 
  CheckCircle,
  ArrowRight, 
  Filter, 
  Key, 
  Globe, 
  Mail,
  WarningCircle,
  Lock,
  Calendar,
  Clock,
  Pencil,
  Shield,
  Trash,
  Check,
} from '@strapi/icons';

const TokensPage = () => {
  const { get, post } = useFetchClient();
  const { toggleNotification } = useNotification();
  const { del } = useFetchClientHelper();
  
  // States
  const [tokens, setTokens] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [jwtSessions, setJwtSessions] = useState([]);
  const [isLoadingJwt, setIsLoadingJwt] = useState(true);
  const [activeTab, setActiveTab] = useState('magic-links'); // 'magic-links' oder 'jwt-sessions'
  const [showRevokedTokens, setShowRevokedTokens] = useState(false);
  const [selectedTokens, setSelectedTokens] = useState([]);
  const [showIPBanModal, setShowIPBanModal] = useState(false);
  const [ipToBan, setIpToBan] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [emailToCreate, setEmailToCreate] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTokenDetailModal, setShowTokenDetailModal] = useState(false);
  const [selectedToken, setSelectedToken] = useState(null);
  const [extensionDays, setExtensionDays] = useState(7); // Standardwert für Verlängerung: 7 Tage
  const [sendEmail, setSendEmail] = useState(true); // Flag für E-Mail-Versand
  const [jsonContext, setJsonContext] = useState(''); // JSON Kontext
  const [emailValidationStatus, setEmailValidationStatus] = useState(null); // Status der E-Mail-Validierung
  const [isValidatingEmail, setIsValidatingEmail] = useState(false); // Loading-Status für E-Mail-Validierung
  const [bannedIPs, setBannedIPs] = useState([]);
  const [isLoadingBannedIPs, setIsLoadingBannedIPs] = useState(false);
  const [ipToUnban, setIpToUnban] = useState('');
  const [showIPUnbanModal, setShowIPUnbanModal] = useState(false);

  // Lade Magic Link Tokens
  const fetchTokens = async () => {
    setIsLoading(true);
    try {
      const response = await get('/magic-link/tokens');
      // Die Struktur der Antwort hat sich geändert, prüfe auf response.data.data
      if (response && response.data) {
        // Wenn response.data ein Objekt mit data-Eigenschaft ist (neue Struktur)
        if (response.data.data) {
          setTokens(response.data.data);
        } else {
          // Alte Struktur, wo response.data direkt das Array ist
          setTokens(response.data);
        }
      } else {
        setTokens([]);
      }
    } catch (error) {
      console.error("Error loading tokens:", error);
      setTokens([]); // Im Fehlerfall leeres Array setzen
      toggleNotification({
        type: 'warning',
        message: 'Error loading Magic Link tokens'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Lade JWT Sessions
  const fetchJwtSessions = async () => {
    setIsLoadingJwt(true);
    try {
      const response = await get('/magic-link/jwt-sessions');
      if (response && response.data) {
        setJwtSessions(response.data);
      } else {
        // Wenn keine Daten zurückgegeben werden, leeres Array setzen
        setJwtSessions([]);
      }
    } catch (error) {
      console.error("Error loading JWT sessions:", error);
      // Bei Fehlern leeres Array setzen, damit die UI nicht abstürzt
      setJwtSessions([]);
      toggleNotification({
        type: 'warning',
        message: 'Error loading JWT sessions'
      });
    } finally {
      setIsLoadingJwt(false);
    }
  };

  // Lade gesperrte IPs
  const fetchBannedIPs = async () => {
    setIsLoadingBannedIPs(true);
    try {
      const response = await get('/magic-link/banned-ips');
      if (response && response.ips) {
        setBannedIPs(response.ips);
      } else {
        setBannedIPs([]);
      }
    } catch (error) {
      console.error("Error loading banned IPs:", error);
      setBannedIPs([]);
      toggleNotification({
        type: 'warning',
        message: 'Error loading banned IPs'
      });
    } finally {
      setIsLoadingBannedIPs(false);
    }
  };

  // IP entsperren
  const unbanIP = async () => {
    try {
      await post('/magic-link/unban-ip', {
        data: { ip: ipToUnban }
      });
      
      toggleNotification({
        type: 'success',
        message: `IP ${ipToUnban} has been unbanned`
      });
      
      // IPs neu laden
      fetchBannedIPs();
      setIpToUnban('');
      setShowIPUnbanModal(false);
    } catch (error) {
      console.error("Error unbanning IP:", error);
      toggleNotification({
        type: 'warning',
        message: 'Error unbanning IP'
      });
    }
  };

  // Finde Benutzer anhand der E-Mail
  const findUserByEmail = async (email) => {
    try {
      // Verwende die Plugin-eigene Route statt der geschützten API
      const response = await get('/magic-link/validate-email', {
        params: { email }
      });
      
      if (response && response.data && response.data.exists) {
        return {
          id: response.data.id,
          documentId: response.data.documentId || response.data.id
        };
      }
      return null;
    } catch (error) {
      console.error("Error validating email:", error);
      // Nur Log-Ausgabe, kein Fehlerwerfen oder Benachrichtigung
      // Toggle-Notification wird von der aufrufenden Funktion gehandhabt
      return null;
    }
  };

  // Navigiere zum Benutzerprofil
  const navigateToUserProfile = async (email) => {
    try {
      const user = await findUserByEmail(email);
      
      if (user) {
        // Verwende documentId falls vorhanden, ansonsten die normale ID
        const idToUse = user.documentId || user.id;
        
        // Öffne das Benutzerprofil in einem neuen Tab mit dem korrekten Pfad
        window.open(`/admin/content-manager/collection-types/plugin::users-permissions.user/${idToUse}`, '_blank');
      } else {
        toggleNotification({
          type: 'warning',
          message: `No user found with email ${email}`
        });
      }
    } catch (error) {
      console.error("Error navigating to user profile:", error);
      toggleNotification({
        type: 'warning',
        message: 'Error navigating to user profile'
      });
    }
  };

  // Überprüfe, ob die E-Mail-Adresse gültig ist und ob ein Benutzer erstellt werden kann
  const validateEmail = async (email) => {
    if (!email || !email.includes('@')) {
      setEmailValidationStatus({
        valid: false,
        message: 'Please enter a valid email address.'
      });
      return false;
    }

    setIsValidatingEmail(true);
    setEmailValidationStatus(null);

    try {
      // Prüfe zuerst die Plugin-Einstellungen
      const settingsResponse = await get('/magic-link/settings');
      
      // Berücksichtige verschiedene Antwortstrukturen:
      // 1. Direkte Einstellungen: settingsResponse.data
      // 2. Verschachtelte Einstellungen: settingsResponse.data.settings
      // 3. Zusätzliche Struktur: settingsResponse.data.data oder settingsResponse.data.data.settings
      const rawSettings = settingsResponse.data || {};
      let settings = { ...rawSettings };
      
      // Entpacke verschachtelte Strukturen
      if (settings.settings) settings = { ...settings, ...settings.settings };
      if (settings.data) {
        settings = { ...settings, ...settings.data };
        if (settings.data.settings) settings = { ...settings, ...settings.data.settings };
      }
      
      // Debug-Ausgaben
      console.log('Rohe API-Antwort:', settingsResponse);
      console.log('Verarbeitete Einstellungen:', settings);
      console.log('createUserIfNotExists Wert:', settings.createUserIfNotExists);
      console.log('Typ von createUserIfNotExists:', typeof settings.createUserIfNotExists);
      
      // Prüfe auf mehrere Arten ob die Benutzererstelling aktiviert ist
      // 1. Boolean-Wert direkt
      // 2. String-Wert "true"
      // 3. Objekt mit type="boolean" und value=true
      const canCreateUser = 
        (typeof settings.createUserIfNotExists === 'boolean' && settings.createUserIfNotExists) ||
        (typeof settings.createUserIfNotExists === 'string' && settings.createUserIfNotExists === 'true') ||
        (settings.createUserIfNotExists?.type === 'boolean' && settings.createUserIfNotExists.value) ||
        (typeof settings.create_new_user === 'boolean' && settings.create_new_user) ||
        (typeof settings.create_new_user === 'string' && settings.create_new_user === 'true') ||
        (settings.create_new_user?.type === 'boolean' && settings.create_new_user.value);
      
      console.log('canCreateUser berechnet:', canCreateUser);
      
      // Wenn automatische Benutzererstellung aktiviert ist, brauchen wir nicht zu prüfen,
      // ob der Benutzer existiert - wir können immer einen Token erstellen 
      if (canCreateUser) {
        setEmailValidationStatus({
          valid: true,
          message: 'Token can be created. User will be automatically created if needed.'
        });
        return true;
      }
      
      // Rest der Funktion bleibt gleich
      const user = await findUserByEmail(email);
      
      // Wenn der Benutzer existiert, ist alles in Ordnung
      if (user) {
        setEmailValidationStatus({
          valid: true,
          message: 'User found. Token can be created.'
        });
        return true;
      } else {
        // Andernfalls ist der Passwordless Login nicht möglich
        setEmailValidationStatus({
          valid: false,
          message: 'The email does not exist, and automatic user creation is disabled.'
        });
        return false;
      }
    } catch (error) {
      console.error("Error validating email:", error);
      setEmailValidationStatus({
        valid: false,
        message: 'Validation error. Please try again.'
      });
      return false;
    } finally {
      setIsValidatingEmail(false);
    }
  };

  // Magic Link Token blockieren
  const blockToken = async (tokenId) => {
    try {
      await post(`/magic-link/tokens/${tokenId}/block`);
      
      setTokens(prevTokens => 
        prevTokens.map(token => 
          token.id === tokenId ? { ...token, is_active: false } : token
        )
      );
      
      toggleNotification({
        type: 'success',
        message: 'Token successfully blocked'
      });
    } catch (error) {
      console.error("Error blocking token:", error);
      toggleNotification({
        type: 'warning',
        message: 'Error blocking token'
      });
    }
  };

  // Magic Link Token aktivieren
  const activateToken = async (tokenId) => {
    try {
      await post(`/magic-link/tokens/${tokenId}/activate`);
      
      setTokens(prevTokens => 
        prevTokens.map(token => 
          token.id === tokenId ? { ...token, is_active: true } : token
        )
      );
      
      // Falls der Token im Detail-Modal angezeigt wird, aktualisieren wir auch diesen
      if (selectedToken && selectedToken.id === tokenId) {
        setSelectedToken({ ...selectedToken, is_active: true });
      }
      
      toggleNotification({
        type: 'success',
        message: 'Token successfully activated'
      });
    } catch (error) {
      console.error("Error activating token:", error);
      toggleNotification({
        type: 'warning',
        message: 'Error activating token'
      });
    }
  };

  // Gültigkeitsdauer eines Tokens verlängern
  const extendTokenValidity = async (tokenId, days) => {
    try {
      const response = await post(`/magic-link/tokens/${tokenId}/extend`, {
        days: days
      });
      
      if (response && response.data) {
        setTokens(prevTokens => 
          prevTokens.map(token => 
            token.id === tokenId ? { ...token, expires_at: response.data.expires_at } : token
          )
        );
        
        // Falls der Token im Detail-Modal angezeigt wird, aktualisieren wir auch diesen
        if (selectedToken && selectedToken.id === tokenId) {
          setSelectedToken({ ...selectedToken, expires_at: response.data.expires_at });
        }
      }
      
      toggleNotification({
        type: 'success',
        message: `Token validity extended by ${days} days`
      });
    } catch (error) {
      console.error("Error extending token validity:", error);
      toggleNotification({
        type: 'warning',
        message: 'Error extending token validity'
      });
    }
  };

  // Sperre einen JWT-Token
  const revokeJwtSession = async (session) => {
    try {
      await post('/magic-link/revoke-jwt', {
        sessionId: session.id,
        userId: session.userId
      });
      
      fetchJwtSessions();
      toggleNotification({
        type: 'success',
        message: 'Session successfully revoked'
      });
    } catch (error) {
      console.error("Error revoking session:", error);
      toggleNotification({
        type: 'danger',
        message: 'Error revoking session'
      });
    }
  };

  // Entsperre einen JWT-Token
  const unrevokeJwtSession = async (session) => {
    try {
      await post('/magic-link/unrevoke-jwt', {
        sessionId: session.id,
        userId: session.userId
      });
      
      fetchJwtSessions();
      toggleNotification({
        type: 'success',
        message: 'Session successfully unrevoked'
      });
    } catch (error) {
      console.error("Error unrevoking session:", error);
      toggleNotification({
        type: 'danger',
        message: 'Error unrevoking session'
      });
    }
  };

  // Formatiere Datum
  const formatDate = (dateString) => {
    if (!dateString) return 'Not available';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Berechne, ob ein Datum abgelaufen ist
  const isExpired = (dateString) => {
    if (!dateString) return false;
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      
      // Prüfe, ob das Datum gültig ist (nicht NaN)
      if (isNaN(date.getTime())) return false;
      
      return date < now;
    } catch (error) {
      console.error('Error checking expiration date:', error);
      return false;
    }
  };

  // Die Browser-Erkennung verbessern
  const extractBrowserInfo = (userAgent) => {
    if (!userAgent) return { name: 'Unknown', device: 'Unknown', version: '', osVersion: '' };
    
    let browser = 'Unknown';
    let device = 'Desktop';
    let version = '';
    let osVersion = '';
    
    // Browser-Erkennung mit Version
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
      browser = 'Chrome';
      const match = userAgent.match(/Chrome\/(\d+\.\d+)/);
      version = match ? match[1] : '';
    }
    else if (userAgent.includes('Firefox')) {
      browser = 'Firefox';
      const match = userAgent.match(/Firefox\/(\d+\.\d+)/);
      version = match ? match[1] : '';
    }
    else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      browser = 'Safari';
      const match = userAgent.match(/Version\/(\d+\.\d+)/);
      version = match ? match[1] : '';
    }
    else if (userAgent.includes('Edg')) {
      browser = 'Edge';
      const match = userAgent.match(/Edg\/(\d+\.\d+)/);
      version = match ? match[1] : '';
    }
    else if (userAgent.includes('MSIE') || userAgent.includes('Trident')) {
      browser = 'Internet Explorer';
      const match = userAgent.includes('MSIE') ? 
        userAgent.match(/MSIE (\d+\.\d+)/) : 
        userAgent.match(/rv:(\d+\.\d+)/);
      version = match ? match[1] : '';
    }
    else if (userAgent.includes('Opera') || userAgent.includes('OPR')) {
      browser = 'Opera';
      const match = userAgent.includes('OPR') ? 
        userAgent.match(/OPR\/(\d+\.\d+)/) : 
        userAgent.match(/Opera\/(\d+\.\d+)/);
      version = match ? match[1] : '';
    }
    
    // Geräte-Erkennung mit Version
    if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
      device = 'iOS';
      const match = userAgent.match(/OS (\d+_\d+)/);
      osVersion = match ? match[1].replace('_', '.') : '';
    } else if (userAgent.includes('Android')) {
      device = 'Android';
      const match = userAgent.match(/Android (\d+(\.\d+)?)/);
      osVersion = match ? match[1] : '';
    } else if (userAgent.includes('Windows')) {
      device = 'Windows';
      if (userAgent.includes('Windows NT 10.0')) osVersion = '10/11';
      else if (userAgent.includes('Windows NT 6.3')) osVersion = '8.1';
      else if (userAgent.includes('Windows NT 6.2')) osVersion = '8';
      else if (userAgent.includes('Windows NT 6.1')) osVersion = '7';
      else if (userAgent.includes('Windows NT 6.0')) osVersion = 'Vista';
      else if (userAgent.includes('Windows NT 5.1')) osVersion = 'XP';
    } else if (userAgent.includes('Mac OS')) {
      device = 'macOS';
      // Versuche macOS Version zu extrahieren
      const match = userAgent.match(/Mac OS X (\d+[._]\d+([._]\d+)?)/);
      if (match) {
        osVersion = match[1].replace(/_/g, '.');
        // Übersetze die Version in gebräuchliche Namen (wenn möglich)
        if (osVersion.startsWith('10.15')) osVersion += ' (Catalina)';
        else if (osVersion.startsWith('10.14')) osVersion += ' (Mojave)';
        else if (osVersion.startsWith('10.13')) osVersion += ' (High Sierra)';
        else if (osVersion.startsWith('11.')) osVersion += ' (Big Sur)';
        else if (osVersion.startsWith('12.')) osVersion += ' (Monterey)';
        else if (osVersion.startsWith('13.')) osVersion += ' (Ventura)';
        else if (osVersion.startsWith('14.')) osVersion += ' (Sonoma)';
      }
    } else if (userAgent.includes('Linux')) {
      device = 'Linux';
      // Linux Version ist oft schwierig zu extrahieren
      if (userAgent.includes('Ubuntu')) osVersion = 'Ubuntu';
      else if (userAgent.includes('Fedora')) osVersion = 'Fedora';
      else if (userAgent.includes('Debian')) osVersion = 'Debian';
    } else if (userAgent.includes('Mobile')) {
      device = 'Mobile';
    }
    
    return { name: browser, device, version, osVersion };
  };

  // Bulk Delete Funktion
  const bulkDeleteTokens = async () => {
    try {
      // Unterscheide zwischen JWT-Sessions und Magic-Link-Tokens
      if (activeTab === 'jwt-sessions') {
        // Für JWT-Sessions den korrekten Endpunkt verwenden
        await Promise.all(
          selectedTokens.map(sessionId => 
            post('/magic-link/revoke-jwt', {
              sessionId: sessionId,
              // Finde die entsprechende Session, um die userId zu erhalten
              userId: jwtSessions.find(s => s.id === sessionId)?.userId || ''
            })
          )
        );
        
        await fetchJwtSessions();
      } else {
        // Für Magic-Link-Tokens den bestehenden Endpunkt verwenden
        await Promise.all(
          selectedTokens.map(tokenId => 
            del(`/magic-link/tokens/${tokenId}`)
          )
        );
        
        await fetchTokens();
      }
      
      toggleNotification({
        type: 'success',
        message: `${selectedTokens.length} ${activeTab === 'jwt-sessions' ? 'Session(s)' : 'Token(s)'} successfully ${activeTab === 'jwt-sessions' ? 'revoked' : 'deleted'}`,
      });
      setSelectedTokens([]);
    } catch (error) {
      console.error('Error during bulk delete:', error);
      toggleNotification({
        type: 'danger',
        message: `Error ${activeTab === 'jwt-sessions' ? 'revoking' : 'deleting'} selected ${activeTab === 'jwt-sessions' ? 'sessions' : 'tokens'}`,
      });
    }
  };

  // IP-Bann Funktion implementieren
  const banIP = async () => {
    try {
      if (!ipToBan) {
        toggleNotification({
          type: 'warning',
          message: 'Please enter a valid IP address',
        });
        return;
      }

      // Korrektes Format für die IP-Bann-Anfrage
      await post('/magic-link/ban-ip', { 
        data: { ip: ipToBan }
      });
      
      toggleNotification({
        type: 'success',
        message: `IP ${ipToBan} has been successfully banned`,
      });

      // Aktualisiere die Token-Liste
      await fetchTokens();
      setShowIPBanModal(false);
      setIpToBan('');
      
    } catch (error) {
      console.error('IP ban failed:', error);
      toggleNotification({
        type: 'danger',
        message: error.response?.data?.message || 'Error banning IP',
      });
    }
  };

  // Aufräumen der abgelaufenen Sessions
  const cleanupSessions = async () => {
    try {
      setIsLoadingJwt(true);
      const response = await post('/magic-link/cleanup-sessions');
      fetchJwtSessions();
      
      toggleNotification({
        type: 'success',
        message: response.data.message || 'Expired sessions have been cleaned up'
      });
    } catch (error) {
      console.error("Error cleaning up sessions:", error);
      toggleNotification({
        type: 'danger',
        message: 'Error cleaning up expired sessions'
      });
    } finally {
      setIsLoadingJwt(false);
    }
  };

  // Neue Funktion zum Erstellen eines Tokens
  const createToken = async () => {
    try {
      // Validiere zuerst die E-Mail
      const isValid = await validateEmail(emailToCreate);
      if (!isValid) {
        // Zeige die Validierungsfehlermeldung, falls vorhanden
        if (emailValidationStatus && emailValidationStatus.message) {
          toggleNotification({
            type: 'warning',
            message: emailValidationStatus.message
          });
        }
        return; // Beende die Funktion, wenn die E-Mail nicht gültig ist
      }

      setIsCreating(true);
      
      // Parse den JSON-Kontext, falls vorhanden
      let parsedContext = {};
      if (jsonContext.trim()) {
        try {
          parsedContext = JSON.parse(jsonContext);
        } catch (e) {
          toggleNotification({
            type: 'warning',
            message: 'The JSON context is not valid. Please correct the format.',
          });
          setIsCreating(false);
          return;
        }
      }
      
      // Erstelle den Token mit allen Parametern
      const { data } = await post('/magic-link/tokens', { 
        email: emailToCreate,
        send_email: sendEmail,
        context: parsedContext
      });
      
      toggleNotification({
        type: 'success',
        message: `Token for ${emailToCreate} has been created!`,
      });
      
      // Zurücksetzen der Felder
      setEmailToCreate('');
      setJsonContext('');
      setSendEmail(true);
      setEmailValidationStatus(null);
      
      fetchTokens(); // Token-Liste aktualisieren
    } catch (error) {
      console.error('Error creating token:', error);
      // Zeige die spezifische Fehlermeldung vom Backend an
      const errorMessage = error.response?.data?.error?.message || 
                         error.response?.data?.message || 
                         'Error creating token';
      toggleNotification({
        type: 'danger',
        // message: error.response?.data?.message || 'Fehler beim Erstellen des Tokens',
        message: errorMessage,
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Funktion zum Öffnen des Token-Detail-Modals
  const openTokenDetailModal = (token) => {
    setSelectedToken(token);
    setShowTokenDetailModal(true);
  };

  // Initialisiere Daten beim Laden
  useEffect(() => {
    fetchTokens();
    fetchJwtSessions();
    fetchBannedIPs();
  }, []);

  // Aktive Magic Link Tokens
  const activeTokens = tokens.filter(token => token.is_active);
  
  // Gefilterte JWT Sessions
  const filteredJwtSessions = showRevokedTokens 
    ? jwtSessions 
    : jwtSessions.filter(session => !session.revoked);

  // Token-Zusammenfassung
  const tokenStats = {
    total: tokens.length || 0,
    active: activeTokens.length || 0,
    expired: activeTokens.filter(token => isExpired(token.expires_at)).length || 0,
    valid: activeTokens.filter(token => !isExpired(token.expires_at)).length || 0,
  };

  // JWT-Zusammenfassung
  const jwtStats = {
    total: jwtSessions.length || 0,
    active: jwtSessions.filter(s => !s.revoked && !isExpired(s.expiresAt)).length || 0,
    expired: jwtSessions.filter(s => !s.revoked && isExpired(s.expiresAt)).length || 0,
    revoked: jwtSessions.filter(s => s.revoked).length || 0,
  };

  // Statistikkarte Komponente für einheitliches Design
  const StatCard = ({ title, value, color, icon }) => (
    <Box 
      background="neutral0" 
      padding={4} 
      shadow="tableShadow" 
      hasRadius
      borderColor={color}
      borderWidth="2px"
      borderStyle="solid"
      style={{ 
        transition: 'all 0.2s ease-in-out', 
        cursor: 'default',
        height: '100%', 
        display: 'flex',
        flexDirection: 'column'
      }}
      hover={{ shadow: 'popupShadow', transform: 'translateY(-2px)' }}
    >
      <Flex alignItems="center" gap={2} paddingBottom={3}>
        <Box 
          background={`${color}20`} 
          padding={2} 
          style={{
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            textAlign: 'center',
            position: 'relative'
          }}
        >
          <Box style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
            {React.cloneElement(icon, { fill: color })}
          </Box>
        </Box>
        <Typography variant="delta" textColor="neutral600">{title}</Typography>
      </Flex>
      <Box style={{ flexGrow: 1, display: 'flex', textAlign: 'center' }}>
        <Box style={{ margin: 'auto' }}>
          <Typography variant="alpha" textAlign="center" textColor={color || "neutral800"}>{value}</Typography>
        </Box>
      </Box>
    </Box>
  );
  
  // Status-Badge Komponente
  const StatusBadge = ({ status, text, subText }) => {
    let color, background, icon;
    
    switch(status) {
      case 'success':
        color = 'success600';
        background = 'success100';
        icon = <Key fill={color} />;
        break;
      case 'warning':
        color = 'warning600';
        background = 'warning100';
        icon = <WarningCircle fill={color} />;
        break;
      case 'danger':
        color = 'danger600';
        background = 'danger100';
        icon = <Lock fill={color} />;
        break;
      default:
        color = 'neutral600';
        background = 'neutral100';
        icon = <Information fill={color} />;
    }
    
    return (
      <Box
        background={background}
        padding="6px 8px"
        hasRadius
        style={{ 
          display: 'inline-flex',
          marginBottom: '4px',
          borderLeft: `3px solid var(--strapi-${color})`,
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
          width: 'fit-content',
          position: 'relative'
        }}
      >
        <Tooltip content={subText}>
          <Flex>
            {icon}
            <Typography variant="pi" fontWeight="bold" textColor={color}>
              {text}
            </Typography>
          </Flex>
        </Tooltip>
      </Box>
    );
  };

  // Hauptrender
  return (
    <Main>
      {/* Header */}
      <Box 
        background="neutral100" 
        padding={6} 
        shadow="tableShadow"
        hasRadius
        style={{ borderBottom: '1px solid #EAEAEF' }}
      >
        <Flex justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="alpha" paddingBottom={2}>
              Token Management
            </Typography>
            <br />
            <Typography variant="epsilon" textColor="neutral600">
              Manage Magic Link tokens and JWT sessions
            </Typography>
          </Box>
          <Flex gap={2}>
            <Button 
              onClick={() => setShowCreateModal(true)}
              startIcon={<Plus />}
              variant="default"
            >
              Create Token
            </Button>
            <Button 
              onClick={bulkDeleteTokens}
              variant="danger"
              startIcon={<Trash />}
            >
              {activeTab === 'jwt-sessions' ? 'Bulk Revoke' : 'Bulk Delete'}
            </Button>
            <Button
              variant="secondary"
              startIcon={<Shield />}
              onClick={() => {
                const ips = [...new Set(selectedTokens
                  .map(tokenId => tokens.find(t => t.id === tokenId)?.ip_address)
                  .filter(Boolean))];
                setIpToBan(ips.join(', '));
                setShowIPBanModal(true);
              }}
            >
              Ban IPs ({new Set(selectedTokens
                .map(tokenId => tokens.find(t => t.id === tokenId)?.ip_address)
                .filter(Boolean)).size})
            </Button>
            <Button
              startIcon={<ArrowRight fill="primary600" />}
              onClick={() => {
                fetchTokens();
                fetchJwtSessions();
              }}
              disabled={isLoading || isLoadingJwt}
            >
              Refresh
            </Button>
            <Button
              variant="secondary"
              startIcon={<ArrowLeft fill="neutral600" />}
              onClick={() => window.location.href = '/admin/plugins/magic-link'}
            >
              Back
            </Button>
          </Flex>
        </Flex>
      </Box>

      {/* Tab Navigation */}
      <Box padding={4} background="neutral0" shadow="filterShadow" marginTop={4} hasRadius>
        <Flex gap={4}>
          <Button
            variant={activeTab === 'magic-links' ? "primary" : "tertiary"}
            onClick={() => setActiveTab('magic-links')}
            fullWidth
          >
            Magic Link Tokens
          </Button>
          <Button
            variant={activeTab === 'jwt-sessions' ? "primary" : "tertiary"}
            onClick={() => setActiveTab('jwt-sessions')}
            fullWidth
          >
            JWT Sessions
          </Button>
          <Button
            variant={activeTab === 'ip-bans' ? "primary" : "tertiary"}
            onClick={() => setActiveTab('ip-bans')}
            fullWidth
          >
            IP Bans
          </Button>
        </Flex>
      </Box>

      {/* Tab Content */}
      <Box padding={4}>
        {/* Magic Links Tab */}
        {activeTab === 'magic-links' && (
          <>
            {/* Statistiken */}
            <Flex justifyContent="center" paddingBottom={4}>
              <Flex 
                gap={4} 
                padding={4} 
                background="neutral0" 
                shadow="tableShadow" 
                hasRadius
                wrap="wrap"
                style={{ 
                  width: '100%',
                  maxWidth: '800px',
                  justifyContent: 'center'
                }}
              >
                {[
                  { title: "All Tokens", value: tokenStats.total, color: "neutral800", icon: <Key /> },
                  { title: "Active Tokens", value: tokenStats.active, color: "success500", icon: <Key /> },
                  { title: "Valid Tokens", value: tokenStats.valid, color: "primary600", icon: <Key /> },
                  { title: "Expired Tokens", value: tokenStats.expired, color: "warning500", icon: <WarningCircle /> }
                ].map((stat, index) => (
                  <Box 
                    key={index}
                    style={{ 
                      flex: '1 1 180px', 
                      minWidth: '180px',
                      maxWidth: '240px'
                    }}
                  >
                    <StatCard 
                      title={stat.title}
                      value={stat.value}
                      color={stat.color}
                      icon={stat.icon}
                      style={{ textAlign: 'center' }}
                    />
                  </Box>
                ))}
              </Flex>
            </Flex>
            
            {/* Token Tabelle */}
            <Box 
              background="neutral0" 
              padding={4} 
              shadow="tableShadow" 
              hasRadius
              style={{ 
                border: '1px solid #EAEAEF',
                borderRadius: '4px'
              }}
            >
              <Flex justifyContent="space-between" alignItems="center" paddingBottom={4}>
                <Typography variant="beta">
                  Magic Link Tokens ({activeTokens.length})
                </Typography>
                <Flex gap={2}>
                  <Badge 
                    backgroundColor="primary100" 
                    textColor="primary600" 
                    padding={2}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Key fill="primary600" />
                    Active Tokens: {tokenStats.active}
                  </Badge>
                </Flex>
              </Flex>
              
              {isLoading ? (
                <Flex justifyContent="center" alignItems="center" paddingTop={6} paddingBottom={6}>
                  <Loader>Loading tokens...</Loader>
                </Flex>
              ) : activeTokens.length === 0 ? (
                <EmptyStateLayout
                  icon={<Information fill="neutral600" />}
                  content="No active Magic Link tokens found"
                  action={
                    <Button 
                      variant="secondary" 
                      startIcon={<ArrowRight fill="primary600" />}
                      onClick={fetchTokens}
                    >
                      Refresh
                    </Button>
                  }
                />
              ) : (
                <Box overflow="auto" style={{ borderRadius: '4px', border: '1px solid #EAEAEF' }}>
                  <Table 
                    colCount={5} 
                    rowCount={activeTokens.length} 
                    style={{
                      borderCollapse: 'separate',
                      borderSpacing: 0,
                    }}
                  >
                    <Thead background="neutral100">
                      <Tr style={{ borderBottom: '1px solid var(--neutral-200)' }}>
                        <Th width="5%">
                          <Checkbox
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedTokens(activeTokens.map(t => t.id));
                              } else {
                                setSelectedTokens([]);
                              }
                            }}
                            checked={selectedTokens.length === activeTokens.length && activeTokens.length > 0}
                            indeterminate={selectedTokens.length > 0 && selectedTokens.length < activeTokens.length ? true : undefined}
                            aria-label="Select all tokens"
                          />
                        </Th>
                        <Th width="20%">
                          <Flex gap={3} alignItems="center" padding={3}>
                            <Box background="primary100" padding={2} hasRadius>
                              <Mail width="1rem" color="primary600" />
                            </Box>
                            <Typography variant="sigma" textColor="neutral600" fontWeight="bold" textTransform="uppercase">
                              Email
                            </Typography>
                          </Flex>
                        </Th>
                        <Th width="15%">
                          <Flex gap={3} alignItems="center" padding={3}>
                            <Box background="success100" padding={2} hasRadius>
                              <Key width="1rem" color="success600" />
                            </Box>
                            <Typography variant="sigma" textColor="neutral600" fontWeight="bold" textTransform="uppercase">
                              Status
                            </Typography>
                          </Flex>
                        </Th>
                        <Th width="20%">
                          <Flex gap={3} alignItems="center" padding={3}>
                            <Box background="warning100" padding={2} hasRadius>
                              <Globe width="1rem" color="warning600" />
                            </Box>
                            <Typography variant="sigma" textColor="neutral600" fontWeight="bold" textTransform="uppercase">
                              Device Info
                            </Typography>
                          </Flex>
                        </Th>
                        <Th width="30%">
                          <Flex gap={3} alignItems="center" padding={3}>
                            <Box background="primary100" padding={2} hasRadius>
                              <Flex gap={1}>
                                <Clock width="1rem" color="primary600" />
                                <CheckCircle width="1rem" color="primary600" />
                              </Flex>
                            </Box>
                            <Typography variant="sigma" textColor="neutral600" fontWeight="bold" textTransform="uppercase" style={{ paddingLeft: '10px' }}>
                              Last Used / Valid Until
                            </Typography>
                          </Flex>
                        </Th>
                        <Th width="15%">
                          <Flex gap={3} alignItems="center" padding={3}>
                            <Box background="danger100" padding={2} hasRadius>
                              <Pencil width="1rem" color="danger600" />
                            </Box>
                            <Typography variant="sigma" textColor="neutral600" fontWeight="bold" textTransform="uppercase">
                              Actions
                            </Typography>
                          </Flex>
                        </Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {activeTokens.map((token, index) => {
                        const browserInfo = token.user_agent ? extractBrowserInfo(token.user_agent) : { name: 'Unknown', device: 'Unknown', version: '', osVersion: '' };
                        const isTokenExpired = isExpired(token.expires_at);
                        
                        return (
                          <Tr 
                            key={token.id}
                            style={{
                              backgroundColor: index % 2 === 0 ? 'white' : '#F7F7F9',
                              borderBottom: '1px solid #EAEAEF',
                              height: '72px'
                            }}
                          >
                            <Td>
                              <Checkbox
                                aria-label={`Select token for ${token.email}`}
                                checked={selectedTokens.includes(token.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedTokens([...selectedTokens, token.id]);
                                  } else {
                                    setSelectedTokens(selectedTokens.filter(id => id !== token.id));
                                  }
                                }}
                              />
                            </Td>
                            <Td>
                              <Link onClick={() => navigateToUserProfile(token.email)} style={{ cursor: 'pointer' }}>
                                <Typography fontWeight="bold" textColor="primary600">{token.email}</Typography>
                              </Link>
                            </Td>
                            <Td>
                              <Flex direction="column" alignItems="flex-start" gap={1}>
                                {token.is_active ? (
                                  <>
                                    <StatusBadge status="success" text="Active" subText={isTokenExpired ? "Expired" : ""} />
                                    {isTokenExpired && (
                                      <StatusBadge status="warning" text="Expired" subText={formatDate(token.expires_at)} />
                                    )}
                                  </>
                                ) : (
                                  <StatusBadge status="danger" text="Blocked" subText="" />
                                )}
                              </Flex>
                            </Td>
                            <Td>
                              <Flex direction="column" gap={2} alignItems="flex-start">
                                {/* Browser Badge */}
                                <Box
                                  hasRadius
                                  padding={2}
                                  background="primary100"
                                  borderColor="primary200"
                                  style={{
                                    width: '100%',
                                    borderWidth: '1px',
                                    borderStyle: 'solid',
                                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                                  }}
                                >
                                  <Flex alignItems="center">
                                    <Box marginRight={2} style={{ display: 'flex', width: '20px', height: '20px' }}>
                                      <Globe fill="#4945FF" width={16} height={16} />
                                    </Box>
                                    <Typography variant="pi" fontWeight="semiBold">
                                      {browserInfo.name}
                                      {browserInfo.version && <> v{browserInfo.version}</>}
                                    </Typography>
                                  </Flex>
                                </Box>

                                {/* Betriebssystem Badge */}
                                <Box
                                  hasRadius
                                  padding={2}
                                  background="neutral100"
                                  borderColor="neutral200"
                                  style={{
                                    width: '100%',
                                    borderWidth: '1px',
                                    borderStyle: 'solid',
                                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                                  }}
                                >
                                  <Flex alignItems="center">
                                    <Box marginRight={2} style={{ display: 'flex', width: '20px', height: '20px' }}>
                                      <Information fill="#666687" width={16} height={16} />
                                    </Box>
                                    <Typography variant="pi" fontWeight="semiBold">
                                      {browserInfo.device}
                                      {browserInfo.osVersion && <> {browserInfo.osVersion}</>}
                                    </Typography>
                                  </Flex>
                                </Box>
                                
                                {/* IP-Adresse Badge */}
                                {token.ip_address && (
                                  <Box
                                    hasRadius
                                    padding={2}
                                    background="neutral150"
                                    borderColor="neutral200"
                                    style={{
                                      width: '100%',
                                      borderWidth: '1px',
                                      borderStyle: 'solid',
                                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                                    }}
                                  >
                                    <Flex alignItems="center">
                                      <Box marginRight={2} style={{ display: 'flex', width: '20px', height: '20px' }}>
                                        <Shield fill="#666687" width={16} height={16} />
                                      </Box>
                                      <Typography variant="pi" fontWeight="semiBold" fontFamily="monospace">
                                        IP: {token.ip_address}
                                      </Typography>
                                    </Flex>
                                  </Box>
                                )}
                              </Flex>
                            </Td>
                            <Td colSpan={1}>
                              <Box style={{ display: 'table', width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                                {/* Erstellt */}
                                <Box style={{ display: 'table-row' }}>
                                  <Box 
                                    background="neutral100" 
                                    hasRadius
                                    style={{ 
                                      borderLeft: '3px solid var(--strapi-neutral600)',
                                      display: 'table-cell',
                                      padding: '8px',
                                      verticalAlign: 'middle',
                                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                                    }}
                                  >
                                    <Box style={{ display: 'flex', alignItems: 'center' }}>
                                      <Box style={{ width: '24px', display: 'flex', justifyContent: 'center', marginRight: '8px' }}>
                                        <Calendar fill="neutral600" />
                                      </Box>
                                      <Typography variant="pi" fontWeight="bold" textColor="neutral600" style={{width: '120px', display: 'inline-block'}}>Created:</Typography>
                                      <Typography variant="pi">{formatDate(token.createdAt)}</Typography>
                                    </Box>
                                  </Box>
                                </Box>

                                {/* Gültig bis */}
                                <Box style={{ display: 'table-row', marginTop: '8px' }}>
                                  <Box 
                                    background={isTokenExpired ? "danger100" : "success100"} 
                                    hasRadius
                                    style={{ 
                                      borderLeft: `3px solid var(--strapi-${isTokenExpired ? 'danger600' : 'success600'})`,
                                      display: 'table-cell',
                                      padding: '8px',
                                      verticalAlign: 'middle',
                                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                                    }}
                                  >
                                    <Box style={{ display: 'flex', alignItems: 'center' }}>
                                      <Box style={{ width: '24px', display: 'flex', justifyContent: 'center', marginRight: '8px' }}>
                                        <Clock fill={isTokenExpired ? "danger600" : "success600"} />
                                      </Box>
                                      <Typography variant="pi" fontWeight="bold" textColor={isTokenExpired ? "danger600" : "success600"} style={{width: '120px', display: 'inline-block'}}>Valid Until:</Typography>
                                      <Typography variant="pi" textColor={isTokenExpired ? "danger600" : "success600"}>{formatDate(token.expires_at)}</Typography>
                                    </Box>
                                  </Box>
                                </Box>

                                {/* Zuletzt verwendet */}
                                {token.last_used_at && (
                                  <Box style={{ display: 'table-row' }}>
                                    <Box 
                                      background="neutral100" 
                                      hasRadius
                                      style={{ 
                                        borderLeft: '3px solid var(--strapi-primary600)',
                                        display: 'table-cell',
                                        padding: '8px',
                                        verticalAlign: 'middle',
                                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                                      }}
                                    >
                                      <Box style={{ display: 'flex', alignItems: 'center' }}>
                                        <Box style={{ width: '24px', display: 'flex', justifyContent: 'center', marginRight: '8px' }}>
                                          <Clock fill="primary600" />
                                        </Box>
                                        <Typography variant="pi" fontWeight="bold" textColor="primary600" style={{width: '120px', display: 'inline-block'}}>Last Used:</Typography>
                                        <Typography variant="pi">{formatDate(token.last_used_at)}</Typography>
                                      </Box>
                                    </Box>
                                  </Box>
                                )}
                              </Box>
                            </Td>
                            <Td>
                              <Flex direction="column" gap={2}>
                                <Button 
                                  variant="danger-light"
                                  size="S"
                                  onClick={() => blockToken(token.id)}
                                  disabled={!token.is_active}
                                  fullWidth
                                  style={{
                                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                                    transition: 'all 0.2s ease-in-out'
                                  }}
                                >
                                  Block
                                </Button>
                                <Button 
                                  variant="secondary"
                                  size="S"
                                  onClick={() => openTokenDetailModal(token)}
                                  fullWidth
                                  style={{
                                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                                    transition: 'all 0.2s ease-in-out'
                                  }}
                                >
                                  Details
                                </Button>
                              </Flex>
                            </Td>
                          </Tr>
                        );
                      })}
                    </Tbody>
                  </Table>
                </Box>
              )}
            </Box>
          </>
        )}

        {/* JWT Sessions Tab */}
        {activeTab === 'jwt-sessions' && (
          <>
            {/* JWT Statistiken */}
            <Flex justifyContent="center" paddingBottom={4}>
              <Flex 
                gap={4} 
                padding={4} 
                background="neutral0" 
                shadow="tableShadow" 
                hasRadius
                wrap="wrap"
                style={{ 
                  width: '100%',
                  maxWidth: '800px',
                  justifyContent: 'center'
                }}
              >
                {[
                  { title: "All Sessions", value: jwtStats.total, color: "neutral800", icon: <Key /> },
                  { title: "Active Sessions", value: jwtStats.active, color: "success500", icon: <Key /> },
                  { title: "Expired Sessions", value: jwtStats.expired, color: "warning500", icon: <WarningCircle /> },
                  { title: "Revoked Sessions", value: jwtStats.revoked, color: "danger500", icon: <Lock /> }
                ].map((stat, index) => (
                  <Box key={index} style={{ flex: '1 1 180px', minWidth: '180px', maxWidth: '240px' }}>
                    <StatCard 
                      title={stat.title}
                      value={stat.value}
                      color={stat.color}
                      icon={stat.icon}
                    />
                  </Box>
                ))}
              </Flex>
            </Flex>
          
            {/* JWT Session Tabelle */}
            <Box 
              background="neutral0" 
              padding={4} 
              shadow="tableShadow" 
              hasRadius
              style={{ 
                border: '1px solid #EAEAEF',
                borderRadius: '4px'
              }}
            >
              <Flex justifyContent="space-between" alignItems="center" paddingBottom={4}>
                <Typography variant="beta">
                  JWT Sessions ({filteredJwtSessions.length})
                </Typography>
                <Flex gap={2}>
                  <Button
                    variant="secondary"
                    startIcon={<Clock />}
                    onClick={cleanupSessions}
                    disabled={isLoadingJwt}
                  >
                    Clean Up Expired
                  </Button>
                  <Button
                    variant={showRevokedTokens ? "success" : "secondary"}
                    startIcon={showRevokedTokens ? <CheckCircle /> : <Filter />}
                    onClick={() => setShowRevokedTokens(!showRevokedTokens)}
                  >
                    {showRevokedTokens ? 'Show Active Only' : 'Show Revoked Too'}
                  </Button>
                </Flex>
              </Flex>
              
              {isLoadingJwt ? (
                <Flex justifyContent="center" alignItems="center" paddingTop={6} paddingBottom={6}>
                  <Loader>Loading JWT sessions...</Loader>
                </Flex>
              ) : filteredJwtSessions.length === 0 ? (
                <EmptyStateLayout
                  icon={<Information fill="neutral600" />}
                  content={
                    showRevokedTokens 
                      ? "No JWT sessions found" 
                      : "No active JWT sessions found"
                  }
                  action={
                    <Button 
                      variant="secondary" 
                      startIcon={<ArrowRight fill="primary600" />}
                      onClick={fetchJwtSessions}
                    >
                      Refresh
                    </Button>
                  }
                />
              ) : (
                <Box overflow="auto" style={{ borderRadius: '4px', border: '1px solid #EAEAEF' }}>
                  <Table 
                    colCount={7} 
                    rowCount={filteredJwtSessions.length}
                    style={{
                      borderCollapse: 'separate',
                      borderSpacing: 0,
                    }}
                  >
                    <Thead background="neutral150">
                      <Tr style={{ borderBottom: '2px solid #dcdce4' }}>
                        <Th width="5%">
                          <Checkbox
                            aria-label="Select all sessions"
                            indeterminate={selectedTokens.length > 0 && selectedTokens.length < filteredJwtSessions.length ? true : undefined}
                            checked={selectedTokens.length === filteredJwtSessions.length && filteredJwtSessions.length > 0}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedTokens(filteredJwtSessions.map(s => s.id));
                              } else {
                                setSelectedTokens([]);
                              }
                            }}
                          />
                        </Th>
                        <Th width="15%">
                          <Flex gap={2} alignItems="center">
                            <Mail fill="neutral600" />
                            <Typography variant="sigma">User</Typography>
                          </Flex>
                        </Th>
                        <Th width="10%">
                          <Flex gap={2} alignItems="center">
                            <Key fill="neutral600" />
                            <Typography variant="sigma">Status</Typography>
                          </Flex>
                        </Th>
                        <Th width="15%">
                          <Flex gap={2} alignItems="center">
                            <Globe fill="neutral600" />
                            <Typography variant="sigma">Browser/IP</Typography>
                          </Flex>
                        </Th>
                        <Th width="15%">
                          <Flex gap={2} alignItems="center">
                            <Calendar fill="neutral600" />
                            <Typography variant="sigma">Created</Typography>
                          </Flex>
                        </Th>
                        <Th width="15%">
                          <Flex gap={2} alignItems="center">
                            <Clock fill="neutral600" />
                            <Typography variant="sigma">Expires</Typography>
                          </Flex>
                        </Th>
                        <Th width="15%">
                          <Flex gap={2} alignItems="center">
                            <Information fill="neutral600" />
                            <Typography variant="sigma">Source</Typography>
                          </Flex>
                        </Th>
                        <Th width="15%">
                          <Flex gap={2} alignItems="center">
                            <Pencil fill="neutral600" />
                            <Typography variant="sigma">Actions</Typography>
                          </Flex>
                        </Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {filteredJwtSessions.map((session, index) => {
                        const browserInfo = session.userAgent ? extractBrowserInfo(session.userAgent) : { name: 'Unknown', device: 'Unknown', version: '', osVersion: '' };
                        const isSessionExpired = isExpired(session.expiresAt);
                        return (
                          <Tr 
                            key={index}
                            style={{
                              backgroundColor: index % 2 === 0 ? 'white' : '#F7F7F9',
                              borderBottom: '1px solid #EAEAEF',
                              height: '72px'
                            }}
                          >
                            <Td>
                              <Checkbox
                                aria-label={`Select session for ${session.username || session.userId || 'Unknown'}`}
                                checked={selectedTokens.includes(session.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedTokens([...selectedTokens, session.id]);
                                  } else {
                                    setSelectedTokens(selectedTokens.filter(id => id !== session.id));
                                  }
                                }}
                              />
                            </Td>
                            <Td>
                              <Box>
                                <Typography fontWeight="bold" textColor="primary600">
                                  {session.username || session.userId || 'Unknown'}
                                </Typography>
                                {session.email && (
                                  <Link href={`mailto:${session.email}`}>
                                    <Typography variant="pi" textColor="neutral600">
                                      {session.email}
                                    </Typography>
                                  </Link>
                                )}
                              </Box>
                            </Td>
                            <Td>
                              <Flex direction="column" alignItems="flex-start" gap={1}>
                                {session.revoked ? (
                                  <StatusBadge status="danger" text="Revoked" subText="" />
                                ) : (
                                  <>
                                    <StatusBadge status="success" text="Active" subText={isSessionExpired ? "Expired" : ""} />
                                    {isSessionExpired && (
                                      <StatusBadge status="warning" text="Expired" subText={formatDate(session.expiresAt)} />
                                    )}
                                  </>
                                )}
                              </Flex>
                            </Td>
                            <Td>
                              <Flex direction="column" gap={2} alignItems="flex-start">
                                {/* Browser Badge */}
                                <Box
                                  hasRadius
                                  padding={2}
                                  background="primary100"
                                  borderColor="primary200"
                                  style={{
                                    width: '100%',
                                    borderWidth: '1px',
                                    borderStyle: 'solid',
                                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                                  }}
                                >
                                  <Flex alignItems="center">
                                    <Box marginRight={2} style={{ display: 'flex', width: '20px', height: '20px' }}>
                                      <Globe fill="#4945FF" width={16} height={16} />
                                    </Box>
                                    <Typography variant="pi" fontWeight="semiBold">
                                      {browserInfo.name}
                                      {browserInfo.version && <> v{browserInfo.version}</>}
                                    </Typography>
                                  </Flex>
                                </Box>

                                {/* Betriebssystem Badge */}
                                <Box
                                  hasRadius
                                  padding={2}
                                  background="neutral100"
                                  borderColor="neutral200"
                                  style={{
                                    width: '100%',
                                    borderWidth: '1px',
                                    borderStyle: 'solid',
                                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                                  }}
                                >
                                  <Flex alignItems="center">
                                    <Box marginRight={2} style={{ display: 'flex', width: '20px', height: '20px' }}>
                                      <Information fill="#666687" width={16} height={16} />
                                    </Box>
                                    <Typography variant="pi" fontWeight="semiBold">
                                      {browserInfo.device}
                                      {browserInfo.osVersion && <> {browserInfo.osVersion}</>}
                                    </Typography>
                                  </Flex>
                                </Box>
                                
                                {/* IP-Adresse Badge */}
                                {session.ipAddress && (
                                  <Box
                                    hasRadius
                                    padding={2}
                                    background="neutral150"
                                    borderColor="neutral200"
                                    style={{
                                      width: '100%',
                                      borderWidth: '1px',
                                      borderStyle: 'solid',
                                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                                    }}
                                  >
                                    <Flex alignItems="center">
                                      <Box marginRight={2} style={{ display: 'flex', width: '20px', height: '20px' }}>
                                        <Shield fill="#666687" width={16} height={16} />
                                      </Box>
                                      <Typography variant="pi" fontWeight="semiBold" fontFamily="monospace">
                                        IP: {session.ipAddress}
                                      </Typography>
                                    </Flex>
                                  </Box>
                                )}
                              </Flex>
                            </Td>
                            <Td>
                              <Box style={{ display: 'table', width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                                <Box style={{ display: 'table-row' }}>
                                  <Box 
                                    background="neutral100" 
                                    hasRadius
                                    style={{ 
                                      borderLeft: '3px solid var(--strapi-neutral600)',
                                      display: 'table-cell',
                                      padding: '8px',
                                      verticalAlign: 'middle',
                                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                                    }}
                                  >
                                    <Box style={{ display: 'flex', alignItems: 'center' }}>
                                      <Box style={{ width: '24px', display: 'flex', justifyContent: 'center', marginRight: '8px' }}>
                                        <Calendar fill="neutral600" />
                                      </Box>
                                      <Typography variant="pi" textColor="neutral600">{formatDate(session.createdAt)}</Typography>
                                    </Box>
                                  </Box>
                                </Box>
                              </Box>
                            </Td>
                            <Td>
                              <Box style={{ display: 'table', width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                                <Box style={{ display: 'table-row' }}>
                                  <Box 
                                    background={isSessionExpired ? "danger100" : "success100"} 
                                    hasRadius
                                    style={{ 
                                      borderLeft: `3px solid var(--strapi-${isSessionExpired ? 'danger600' : 'success600'})`,
                                      display: 'table-cell',
                                      padding: '8px',
                                      verticalAlign: 'middle',
                                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                                    }}
                                  >
                                    <Box style={{ display: 'flex', alignItems: 'center' }}>
                                      <Box style={{ width: '24px', display: 'flex', justifyContent: 'center', marginRight: '8px' }}>
                                        <Clock fill={isSessionExpired ? "danger600" : "success600"} />
                                      </Box>
                                      <Typography 
                                        variant="pi"
                                        textColor={isSessionExpired ? "danger600" : "success600"}
                                      >
                                        {formatDate(session.expiresAt)}
                                      </Typography>
                                    </Box>
                                  </Box>
                                </Box>
                              </Box>
                            </Td>
                            <Td>
                              <Badge 
                                padding={2}
                                style={{ 
                                  borderRadius: '4px',
                                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                                  display: 'inline-block',
                                  padding: '6px 8px',
                                  height: '28px'
                                }}
                              >
                                <Box style={{ display: 'flex' }}>
                                  <Box style={{ marginRight: '4px', display: 'flex' }}>
                                    <Information fill="neutral600" />
                                  </Box>
                                  <span>
                                    {session.source || "Magic Link Login"}
                                  </span>
                                </Box>
                              </Badge>
                            </Td>
                            <Td>
                              {!session.revoked && !isSessionExpired ? (
                                <Button 
                                  variant="danger-light"
                                  size="S"
                                  onClick={() => revokeJwtSession(session)}
                                  fullWidth
                                  style={{
                                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                                    transition: 'all 0.2s ease-in-out'
                                  }}
                                >
                                  Revoke
                                </Button>
                              ) : session.revoked ? (
                                <Button 
                                  variant="success"
                                  size="S"
                                  onClick={() => unrevokeJwtSession(session)}
                                  fullWidth
                                  style={{
                                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                                    transition: 'all 0.2s ease-in-out'
                                  }}
                                >
                                  Unrevoke
                                </Button>
                              ) : (
                                <Typography variant="pi" textColor="neutral600" textAlign="center">
                                  -
                                </Typography>
                              )}
                            </Td>
                          </Tr>
                        );
                      })}
                    </Tbody>
                  </Table>
                </Box>
              )}
            </Box>
          </>
        )}

        {/* IP-Sperren Tab */}
        {activeTab === 'ip-bans' && (
          <>
            <Box background="neutral0" padding={8} shadow="tableShadow" hasRadius>
              <Flex direction="column" gap={6}>
                <Typography variant="beta">Banned IP Addresses</Typography>
                
                <Flex gap={4} justifyContent="space-between" alignItems="center">
                  <Box>
                    <Button 
                      onClick={() => {
                        fetchBannedIPs();
                        toggleNotification({
                          type: 'info',
                          message: 'IP list refreshed'
                        });
                      }}
                      startIcon={<ArrowRight />}
                      loading={isLoadingBannedIPs}
                    >
                      Refresh
                    </Button>
                  </Box>
                  <Box>
                    <Button 
                      onClick={() => setShowIPBanModal(true)}
                      startIcon={<Shield />}
                      variant="danger"
                    >
                      Ban IP
                    </Button>
                  </Box>
                </Flex>
                
                {isLoadingBannedIPs ? (
                  <Flex justifyContent="center" padding={6}>
                    <Loader>Loading banned IP addresses...</Loader>
                  </Flex>
                ) : (
                  bannedIPs.length === 0 ? (
                    <EmptyStateLayout 
                      icon={<Shield width="6rem" height="6rem" />}
                      content="No banned IP addresses found"
                      action={
                        <Button
                          onClick={() => setShowIPBanModal(true)}
                          startIcon={<Shield />}
                          variant="danger"
                        >
                          Ban IP
                        </Button>
                      }
                    />
                  ) : (
                    <Table colCount={3} rowCount={bannedIPs.length + 1}>
                      <Thead>
                        <Tr>
                          <Th>
                            <Typography variant="sigma">IP Address</Typography>
                          </Th>
                          <Th>
                            <Typography variant="sigma">Tokens</Typography>
                          </Th>
                          <Th>
                            <Typography variant="sigma">Actions</Typography>
                          </Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {bannedIPs.map((ip, index) => (
                          <Tr key={`banned-ip-${index}`}>
                            <Td>
                              <Typography fontFamily="monospace">{ip}</Typography>
                            </Td>
                            <Td>
                              <Badge>
                                {tokens.filter(token => token.ip_address === ip).length} Tokens
                              </Badge>
                            </Td>
                            <Td>
                              <Flex gap={2}>
                                <Button 
                                  onClick={() => {
                                    setIpToUnban(ip);
                                    setShowIPUnbanModal(true);
                                  }}
                                  size="S"
                                  variant="danger-light"
                                >
                                  Unban
                                </Button>
                              </Flex>
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  )
                )}
              </Flex>
            </Box>
          </>
        )}
      </Box>

      {/* IP-Bann Modal */}
      <Modal.Root open={showIPBanModal} onOpenChange={setShowIPBanModal}>
        <Modal.Content>
          <Modal.Header>
            <Modal.Title>Ban IP Address</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Flex direction="column" gap={2}>
              <TextInput
                name="ip"
                label="IP Address"
                value={ipToBan}
                onChange={(e) => setIpToBan(e.target.value)}
                placeholder="e.g., 192.168.1.1"
              />
            </Flex>
          </Modal.Body>
          <Modal.Footer>
            <Button onClick={() => setShowIPBanModal(false)} variant="tertiary">
              Cancel
            </Button>
            <Button onClick={() => {
              banIP();
              setShowIPBanModal(false);
            }} startIcon={<Shield />} variant="danger">
              Ban IP
            </Button>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>

      {/* Modal für die Eingabe der E-Mail */}
      <Modal.Root open={showCreateModal} onOpenChange={setShowCreateModal}>
        <Modal.Content>
          <Modal.Header>
            <Modal.Title>Create New Token</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Box paddingTop={2}>
              <Field.Root 
                name="email" 
                id="email" 
                required
                hint={emailValidationStatus ? emailValidationStatus.message : "The email address for the new token"}
                error={emailValidationStatus && !emailValidationStatus.valid ? emailValidationStatus.message : null}
              >
                <Field.Label>Email Address*</Field.Label>
                <Field.Input
                  type="email"
                  placeholder="user@example.com"
                  name="email"
                  onChange={(e) => {
                    setEmailToCreate(e.target.value);
                    setEmailValidationStatus(null);
                  }}
                  value={emailToCreate}
                  required
                  aria-label="Email Address"
                  error={emailValidationStatus && !emailValidationStatus.valid ? emailValidationStatus.message : undefined}
                />
                {emailValidationStatus && emailValidationStatus.message && (
                  <Field.Hint>{emailValidationStatus.message}</Field.Hint>
                )}
                {emailValidationStatus && !emailValidationStatus.valid && (
                  <Field.Error>{emailValidationStatus.message}</Field.Error>
                )}
              </Field.Root>
              
              <Box paddingTop={4}>
                <Field.Root 
                  name="json-context" 
                  id="json-context" 
                >
                  <Field.Label>JSON Context</Field.Label>
                  <Field.Input
                    as="textarea"
                    placeholder='{"key": "value"}'
                    name="json-context"
                    onChange={(e) => setJsonContext(e.target.value)}
                    value={jsonContext}
                    aria-label="JSON Context"
                    style={{ height: '80px', fontFamily: 'monospace' }}
                  />
                  <Field.Hint>Optional JSON context for the token (e.g., in the form of key-value pairs)</Field.Hint>
                </Field.Root>
              </Box>
              
              <Box paddingTop={4}>
                <Field.Root name="send-email" id="send-email">
                  <Flex gap={2} alignItems="center">
                    <Field.Input
                      type="checkbox"
                      id="send-email"
                      name="send-email"
                      checked={sendEmail}
                      onChange={(e) => setSendEmail(e.target.checked)}
                    />
                    <Field.Label htmlFor="send-email">Send email with Magic Link</Field.Label>
                  </Flex>
                </Field.Root>
              </Box>
            </Box>
          </Modal.Body>
          <Modal.Footer>
            <Button 
              onClick={() => {
                setShowCreateModal(false);
                setEmailToCreate('');
                setJsonContext('');
                setSendEmail(true);
                setEmailValidationStatus(null);
              }}
              variant="tertiary"
            >
              Cancel
            </Button>
            <Flex gap={2}>
              <Button 
                onClick={() => validateEmail(emailToCreate)}
                variant="secondary"
                loading={isValidatingEmail}
              >
                Validate Email
              </Button>
              <Button 
                onClick={() => {
                  createToken();
                }}
                loading={isCreating}
                startIcon={<Check />}
                disabled={isValidatingEmail || (emailValidationStatus && !emailValidationStatus.valid)}
              >
                Create Token
              </Button>
            </Flex>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>

      {/* Token Detail Modal */}
      {selectedToken && (
        <Modal.Root open={showTokenDetailModal} onOpenChange={setShowTokenDetailModal}>
          <Modal.Content style={{ maxWidth: '900px' }}>
            <Modal.Header>
              <Modal.Title>Token Details</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {/* Fallback auf Flex-Layout, da Grid Probleme verursacht */}
              <Box background="neutral100" padding={4} hasRadius style={{ marginBottom: '24px' }}>
                <Typography variant="beta" textColor="primary600" style={{ marginBottom: '12px' }}>
                  General Information
                </Typography>
                <Flex gap={4} wrap="wrap">
                  <Box width="45%" marginBottom={4}>
                    <Box padding={3} background="neutral0" hasRadius shadow="filterShadow" style={{ height: '100%' }}>
                      <Typography variant="delta" fontWeight="bold" textColor="neutral800">Email</Typography>
                      <Box marginTop={2}>
                        <Link onClick={() => navigateToUserProfile(selectedToken.email)} style={{ cursor: 'pointer', textDecoration: 'none' }}>
                          <Typography textColor="primary600">{selectedToken.email}</Typography>
                        </Link>
                      </Box>
                    </Box>
                  </Box>
                  <Box width="45%" marginBottom={4}>
                    <Box padding={3} background="neutral0" hasRadius shadow="filterShadow" style={{ height: '100%' }}>
                      <Typography variant="delta" fontWeight="bold" textColor="neutral800">Token ID</Typography>
                      <Box marginTop={2}>
                        <Typography variant="pi" fontFamily="monospace" style={{ wordBreak: 'break-all' }}>
                          {selectedToken.id}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  <Box width="30%" marginBottom={4}>
                    <Box padding={3} background="neutral0" hasRadius shadow="filterShadow" style={{ height: '100%' }}>
                      <Typography variant="delta" fontWeight="bold" textColor="neutral800">Status</Typography>
                      <Box marginTop={2}>
                        <Flex direction="column" gap={2}>
                          {selectedToken.is_active ? (
                            <Badge backgroundColor="success100" textColor="success600" padding={2}>
                              Active
                            </Badge>
                          ) : (
                            <Badge backgroundColor="danger100" textColor="danger600" padding={2}>
                              Blocked
                            </Badge>
                          )}
                          {isExpired(selectedToken.expires_at) && (
                            <Badge backgroundColor="warning100" textColor="warning600" padding={2}>
                              Expired
                            </Badge>
                          )}
                        </Flex>
                      </Box>
                    </Box>
                  </Box>
                  <Box width="30%" marginBottom={4}>
                    <Box padding={3} background="neutral0" hasRadius shadow="filterShadow" style={{ height: '100%' }}>
                      <Typography variant="delta" fontWeight="bold" textColor="neutral800">User ID</Typography>
                      <Box marginTop={2}>
                        <Typography variant="pi" fontFamily="monospace">
                          {selectedToken.user_id || 'Not available'}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  <Box width="30%" marginBottom={4}>
                    <Box padding={3} background="neutral0" hasRadius shadow="filterShadow" style={{ height: '100%' }}>
                      <Typography variant="delta" fontWeight="bold" textColor="neutral800">IP Address</Typography>
                      <Box marginTop={2}>
                        <Typography variant="pi" fontFamily="monospace">
                          {selectedToken.ip_address || 'Not available'}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Flex>
              </Box>

              <Box background="neutral100" padding={4} hasRadius style={{ marginBottom: '24px' }}>
                <Typography variant="beta" textColor="primary600" style={{ marginBottom: '12px' }}>
                  Temporal Information
                </Typography>
                <Flex gap={4} wrap="wrap">
                  <Box width="30%" marginBottom={4}>
                    <Box padding={3} background="neutral0" hasRadius shadow="filterShadow" style={{ height: '100%' }}>
                      <Typography variant="delta" fontWeight="bold" textColor="neutral800">Created At</Typography>
                      <Box marginTop={2}>
                        <Typography>
                          {formatDate(selectedToken.createdAt)}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  <Box width="30%" marginBottom={4}>
                    <Box padding={3} background={isExpired(selectedToken.expires_at) ? "danger100" : "success100"} hasRadius shadow="filterShadow" style={{ height: '100%' }}>
                      <Typography variant="delta" fontWeight="bold" textColor={isExpired(selectedToken.expires_at) ? "danger600" : "success600"}>
                        Valid Until
                      </Typography>
                      <Box marginTop={2}>
                        <Typography textColor={isExpired(selectedToken.expires_at) ? "danger600" : "success600"}>
                          {formatDate(selectedToken.expires_at)}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  <Box width="30%" marginBottom={4}>
                    <Box padding={3} background="neutral0" hasRadius shadow="filterShadow" style={{ height: '100%' }}>
                      <Typography variant="delta" fontWeight="bold" textColor="neutral800">Last Used</Typography>
                      <Box marginTop={2}>
                        <Typography>
                          {selectedToken.last_used_at ? formatDate(selectedToken.last_used_at) : 'Not used yet'}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Flex>
              </Box>

              {selectedToken.user_agent && (
                <Box background="neutral100" padding={4} hasRadius>
                  <Typography variant="beta" textColor="primary600" style={{ marginBottom: '12px' }}>
                    Device and Browser Information
                  </Typography>
                  <Box padding={3} background="neutral0" hasRadius shadow="filterShadow">
                    <Typography variant="delta" fontWeight="bold" textColor="neutral800">User Agent</Typography>
                    <Box marginTop={2} style={{ wordBreak: 'break-all' }}>
                      <Typography variant="pi" fontFamily="monospace">
                        {selectedToken.user_agent}
                      </Typography>
                    </Box>
                    <Divider marginTop={4} marginBottom={4} />
                    <Flex gap={4} wrap="wrap">
                      <Box width="45%" marginBottom={4}>
                        <Typography variant="delta" fontWeight="bold" textColor="neutral800">Detected Browser</Typography>
                        <Box marginTop={2}>
                          <Typography>
                            {extractBrowserInfo(selectedToken.user_agent).name} {extractBrowserInfo(selectedToken.user_agent).version && ` v${extractBrowserInfo(selectedToken.user_agent).version}`}
                          </Typography>
                        </Box>
                      </Box>
                      <Box width="45%" marginBottom={4}>
                        <Typography variant="delta" fontWeight="bold" textColor="neutral800">Operating System</Typography>
                        <Box marginTop={2}>
                          <Typography>
                            {extractBrowserInfo(selectedToken.user_agent).device} {extractBrowserInfo(selectedToken.user_agent).osVersion && ` ${extractBrowserInfo(selectedToken.user_agent).osVersion}`}
                          </Typography>
                        </Box>
                      </Box>
                    </Flex>
                  </Box>
                </Box>
              )}

              {selectedToken.context && Object.keys(selectedToken.context).length > 0 && (
                 <Box background="neutral100" padding={4} hasRadius>
                   <Typography variant="beta" textColor="primary600" style={{ marginBottom: '12px' }}>
                     Context Data
                   </Typography>
                   <Box padding={3} background="neutral0" hasRadius shadow="filterShadow">
                     <Typography variant="delta" fontWeight="bold" textColor="neutral800">Context JSON</Typography>
                      <Box 
                        background="neutral150" 
                        padding={3} 
                        hasRadius 
                        style={{ 
                          wordBreak: 'break-all',
                          maxHeight: '200px',
                          overflow: 'auto'
                        }}
                      >
                        <Typography variant="pi" fontFamily="monospace">
                          {typeof selectedToken.context === 'object' 
                            ? JSON.stringify(selectedToken.context, null, 2) 
                            : selectedToken.context
                          }
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Flex gap={2} justifyContent="space-between" width="100%">
                <Box>
                  {selectedToken.is_active ? (
                    <Button 
                      onClick={() => blockToken(selectedToken.id)} 
                      variant="danger"
                      startIcon={<Lock />}
                    >
                      Block
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => activateToken(selectedToken.id)} 
                      variant="success"
                      startIcon={<CheckCircle />}
                    >
                      Activate
                    </Button>
                  )}
                </Box>
                
                <Flex gap={2}>
                  <Flex alignItems="center" background="neutral100" padding={2} hasRadius>
                    <TextInput
                      type="number"
                      label=""
                      name="days"
                      value={extensionDays}
                      onChange={(e) => setExtensionDays(parseInt(e.target.value) || 1)}
                      aria-label="Days"
                      style={{ width: '60px' }}
                      min="1"
                      max="365"
                    />
                    <Box paddingLeft={2}>Days</Box>
                  </Flex>
                  
                  <Button 
                    onClick={() => extendTokenValidity(selectedToken.id, extensionDays)} 
                    variant="secondary"
                    startIcon={<Clock />}
                  >
                    Extend Validity
                  </Button>
                  
                  <Button onClick={() => setShowTokenDetailModal(false)} variant="tertiary">
                    Close
                  </Button>
                </Flex>
              </Flex>
            </Modal.Footer>
          </Modal.Content>
        </Modal.Root>
      )}

      {/* IP-Ban-Modal für Entsperren */}
      <Modal.Root open={showIPUnbanModal} onOpenChange={setShowIPUnbanModal}>
        <Modal.Content>
          <Modal.Header>
            <Modal.Title>Unban IP Address</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Typography variant="omega">
              Do you really want to unban the IP address {ipToUnban}?
            </Typography>
          </Modal.Body>
          <Modal.Footer>
            <Button onClick={() => setShowIPUnbanModal(false)} variant="tertiary">
              Cancel
            </Button>
            <Button onClick={unbanIP} startIcon={<CheckCircle />} variant="success">
              Unban IP
            </Button>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>
    </Main>
  );
};

export default TokensPage;