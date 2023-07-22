import {
  Action,
  ActionPanel,
  Alert,
  Icon,
  List,
  LocalStorage,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { Fragment, useEffect, useMemo, useState } from "react";
import { WordTranslation } from "./translationDetails";
import Settings, { useSettings } from "./settings";

export default function Command() {
  const navigation = useNavigation();

  const { searchText, setSearchText, translations } = useSearchTranslations();
  const { addRecentSearch, clearRecentSearches, recentSearches, removeRecentSearch } = useRecentSearches();

  const { shouldShowSettings, loadSettings, settings, translation } = useSettings();

  if (shouldShowSettings) {
    return (
      <Settings
        onDone={() => {
          loadSettings();
        }}
      />
    );
  }

  return (
    <List
      onSearchTextChange={setSearchText}
      actions={
        <ActionPanel>
          <Action
            title="Settings"
            onAction={() => {
              navigation.push(
                <Settings
                  onDone={() => {
                    loadSettings();
                  }}
                  popOnDone
                />
              );
            }}
            icon={Icon.Gear}
          />
        </ActionPanel>
      }
      filtering={false}
      searchBarPlaceholder={`Search from ${translation.from} to ${translation.to} words`}
    >
      {searchText ? (
        <List.Section title="Results">
          {translations.map((translation, index) => (
            <List.Item
              key={index}
              title={translation.word}
              subtitle={translation.lang}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title={translation.word}>
                    <DetailActions
                      word={translation.word}
                      lang={translation.lang}
                      translationKey={settings.translationKey}
                      onSelect={() => {
                        addRecentSearch(translation.word, translation.lang);
                      }}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Settings"
                      onAction={() => {
                        navigation.push(
                          <Settings
                            onDone={() => {
                              loadSettings();
                            }}
                          />
                        );
                      }}
                      icon={Icon.Gear}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : (
        <List.Section title="Recent Searches">
          {recentSearches.map(({ word, lang }, index) => (
            <List.Item
              key={index}
              title={word}
              subtitle={lang}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title={word}>
                    <DetailActions
                      word={word}
                      lang={lang}
                      translationKey={settings.translationKey}
                      onSelect={() => {
                        addRecentSearch(word, lang);
                      }}
                    />
                    <Action
                      title="Delete"
                      onAction={() => {
                        removeRecentSearch(index);
                      }}
                      icon={Icon.Trash}
                      shortcut={{ modifiers: ["ctrl"], key: "x" }}
                      style={Action.Style.Destructive}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Settings"
                      onAction={() => {
                        navigation.push(
                          <Settings
                            onDone={() => {
                              loadSettings();
                            }}
                          />
                        );
                      }}
                      icon={Icon.Gear}
                    />
                    <Action
                      title="Clear Recent Searches"
                      onAction={() => {
                        clearRecentSearches();
                      }}
                      icon={Icon.Trash}
                      shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
                      style={Action.Style.Destructive}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function DetailActions({
  word,
  lang,
  translationKey,
  onSelect,
}: {
  word: string;
  lang: string;
  translationKey: string;
  onSelect?: () => void;
}) {
  const navigation = useNavigation();
  const key = translationKey;
  const otherLang = key.replace(lang, "");
  const urlTranslationKey = lang + otherLang;
  const url = `https://www.wordreference.com/${urlTranslationKey}/${word}`;

  return (
    <Fragment>
      <Action
        title="Show Translation"
        onAction={() => {
          onSelect?.();
          navigation.push(<WordTranslation word={word} lang={lang} baseUrl={urlTranslationKey} />);
        }}
        icon={Icon.ChevronRight}
      />
      <Action.OpenInBrowser url={url} />
    </Fragment>
  );
}
function useSearchTranslations() {
  const [searchText, setSearchText] = useState("");

  const { data } = useFetch<string>("https://www.wordreference.com/autocomplete?dict=enfr&query=" + searchText, {
    method: "GET",
    keepPreviousData: true,
  });

  const translations = useMemo(() => {
    if (!data) {
      return [];
    }

    const lines = data.split("\n");
    const result = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const [word, lang] = line.split("\t");
      result.push({ word, lang });
    }

    return result;
  }, [data]);

  return { searchText, setSearchText, translations };
}

function useRecentSearches() {
  const [recentSearches, setRecentSearches] = useState<{ word: string; lang: string }[]>([]);

  async function loadRecentSearches() {
    const recentSearchesString = await LocalStorage.getItem<string>("recentSearches");
    if (recentSearchesString) {
      setRecentSearches(JSON.parse(recentSearchesString));
    }
  }

  async function saveRecentSearches() {
    await LocalStorage.setItem("recentSearches", JSON.stringify(recentSearches));
  }

  const addRecentSearch = (word: string, lang: string) => {
    const newRecentSearches = recentSearches.filter(
      (recentSearch) => recentSearch.word !== word && recentSearch.lang !== lang
    );
    newRecentSearches.unshift({ word, lang });
    setRecentSearches(newRecentSearches);
  };

  const removeRecentSearch = (index: number) => {
    const newRecentSearches = [...recentSearches];
    newRecentSearches.splice(index, 1);
    setRecentSearches(newRecentSearches);
    showToast({ title: "Successfully deleted", style: Toast.Style.Success });
  };

  const clearRecentSearches = async () => {
    await confirmAlert({
      title: "Clear Recent Searches",
      message: "Are you sure you want to clear all recent searches?",
      icon: Icon.Trash,
      primaryAction: {
        title: "Clear",
        onAction: () => {
          setRecentSearches([]);
          showToast({ title: "Successfully deleted", style: Toast.Style.Success });
        },
        style: Alert.ActionStyle.Destructive,
      },
    });
  };

  useEffect(() => {
    loadRecentSearches();
  }, []);

  useEffect(() => {
    saveRecentSearches();
  }, [recentSearches]);

  return { recentSearches, addRecentSearch, removeRecentSearch, clearRecentSearches };
}
