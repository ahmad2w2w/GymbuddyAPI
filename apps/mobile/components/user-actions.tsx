import { Alert } from 'react-native';
import { Menu, IconButton, Divider } from 'react-native-paper';
import { useState } from 'react';
import { api } from '@/lib/api';

interface UserActionsProps {
  userId: string;
  userName: string;
  onBlock?: () => void;
}

const REPORT_REASONS = [
  { value: 'inappropriate', label: 'Ongepaste content' },
  { value: 'spam', label: 'Spam' },
  { value: 'fake', label: 'Nep profiel' },
  { value: 'harassment', label: 'Intimidatie' },
  { value: 'other', label: 'Anders' },
];

export function UserActions({ userId, userName, onBlock }: UserActionsProps) {
  const [visible, setVisible] = useState(false);

  const handleBlock = () => {
    setVisible(false);
    Alert.alert(
      'Blokkeren',
      `Weet je zeker dat je ${userName} wilt blokkeren? Je ziet elkaar niet meer.`,
      [
        { text: 'Annuleren', style: 'cancel' },
        {
          text: 'Blokkeren',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.blockUser(userId);
              Alert.alert('Geblokkeerd', `${userName} is geblokkeerd`);
              onBlock?.();
            } catch (e: any) {
              Alert.alert('Fout', e.message || 'Kon niet blokkeren');
            }
          }
        }
      ]
    );
  };

  const handleReport = () => {
    setVisible(false);
    Alert.alert(
      'Melden',
      'Waarom wil je deze gebruiker melden?',
      [
        ...REPORT_REASONS.map(reason => ({
          text: reason.label,
          onPress: async () => {
            try {
              await api.reportUser(userId, reason.value);
              Alert.alert('Gemeld', 'Bedankt voor je melding. We zullen dit bekijken.');
            } catch (e: any) {
              Alert.alert('Fout', e.message || 'Kon niet melden');
            }
          }
        })),
        { text: 'Annuleren', style: 'cancel' }
      ]
    );
  };

  return (
    <Menu
      visible={visible}
      onDismiss={() => setVisible(false)}
      anchor={
        <IconButton
          icon="dots-vertical"
          onPress={() => setVisible(true)}
        />
      }
    >
      <Menu.Item
        onPress={handleReport}
        title="Melden"
        leadingIcon="flag"
      />
      <Divider />
      <Menu.Item
        onPress={handleBlock}
        title="Blokkeren"
        leadingIcon="account-cancel"
      />
    </Menu>
  );
}



