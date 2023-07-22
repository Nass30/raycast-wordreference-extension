import { Action, ActionPanel, Form, LocalStorage, Toast, showToast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import translationDictionaries from "./data/translationDictionaries.json";
import translationKeyMap from "./data/translationKeyMap.json";

interface SettingsViewProps {
  onDone: () => void;
  popOnDone?: boolean;
}

export default function Settings({ onDone, popOnDone }: SettingsViewProps) {
  const { settings, setSettings } = useSettings();
  const navigation = useNavigation();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onSubmit = (values: any) => {
    const translation = translationDictionaries.find(({ dictionaries }) =>
      dictionaries.some(({ key }) => key === values.translationKey)
    );
    const newSettings = {
      ...settings,
      ...values,
      translation: {
        key: values.translationKey,
        ...translation,
      },
    };
    setSettings(newSettings);
    onDone();
    if (popOnDone) {
      navigation.pop();
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Configure the extension" />
      <Form.Dropdown id="translationKey" title="Translation Language" defaultValue={settings.translationKey}>
        {translationDictionaries.map(({ language, dictionaries }) => (
          <Form.Dropdown.Section key={language} title={language}>
            {dictionaries.map(({ key, from, to }) => (
              <Form.Dropdown.Item key={key} value={key} title={`${from} - ${to}`} />
            ))}
          </Form.Dropdown.Section>
        ))}
      </Form.Dropdown>
    </Form>
  );
}

interface Settings {
  translationKey: string;
}

const defaultSettings: Settings = {
  translationKey: "enfr",
};

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [shouldShowSettings, setShouldShowSettings] = useState<boolean>(false);

  const translation = translationKeyMap[settings.translationKey as keyof typeof translationKeyMap];

  const _setSettings = async (newSettings: Settings) => {
    setSettings(newSettings);
    setShouldShowSettings(false);
    return saveSettings(newSettings);
  };

  async function loadSettings() {
    const loadedSettings = await LocalStorage.getItem<string>("settings");
    if (loadedSettings) {
      setSettings(JSON.parse(loadedSettings));
      setShouldShowSettings(false);
    } else {
      setShouldShowSettings(true);
    }
  }

  async function saveSettings(newSettings?: Settings) {
    showToast({
      title: "Saving settings...",
      style: Toast.Style.Animated,
    });
    await LocalStorage.setItem("settings", JSON.stringify(newSettings));
    showToast({
      title: "Settings saved",
      style: Toast.Style.Success,
    });
  }

  useEffect(() => {
    loadSettings();
  }, []);

  return {
    settings,
    setSettings: _setSettings,
    shouldShowSettings,
    loadSettings,
    translation,
  };
}
