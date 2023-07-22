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
import { useEffect, useMemo, useState } from "react";
import { WordTranslation } from "./translationDetails";

export default function Command() {
  const navigation = useNavigation();

  const { searchText, setSearchText, translations } = useSearchTranslations();
  const { addRecentSearch, clearRecentSearches, recentSearches, removeRecentSearch } = useRecentSearches();

  return (
    <List onSearchTextChange={setSearchText} actions={<ActionPanel></ActionPanel>} filtering={false}>
      {searchText ? (
        <List.Section title="Results">
          {translations.map((translation, index) => (
            <List.Item
              key={index}
              title={translation.term}
              subtitle={translation.lang}
              actions={
                <ActionPanel>
                  <Action
                    title="Show Translation"
                    onAction={() => {
                      addRecentSearch(translation.term, translation.lang);
                      navigation.push(<WordTranslation word={translation.term} lang={translation.lang} />);
                    }}
                  />
                  <Action.OpenInBrowser
                    url={`https://www.wordreference.com/${translation.lang === "fr" ? "fren" : "enfr"}/${
                      translation.term
                    }`}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : (
        <List.Section title="Recent Searches">
          {recentSearches.map((recentSearch, index) => (
            <List.Item
              key={index}
              title={recentSearch.term}
              subtitle={recentSearch.lang}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title={recentSearch.term}>
                    <Action
                      title="Show Translation"
                      onAction={() => {
                        navigation.push(<WordTranslation word={recentSearch.term} lang={recentSearch.lang} />);
                      }}
                      icon={Icon.ChevronRight}
                    />
                    <Action.OpenInBrowser
                      url={`https://www.wordreference.com/${recentSearch.lang === "fr" ? "fren" : "enfr"}/${
                        recentSearch.term
                      }`}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Delete"
                      onAction={() => {
                        removeRecentSearch(index);
                      }}
                      icon={Icon.Trash}
                      shortcut={{ modifiers: ["ctrl"], key: "x" }}
                      style={Action.Style.Destructive}
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
      const [term, lang] = line.split("\t");
      result.push({ term, lang });
    }

    return result;
  }, [data]);

  return { searchText, setSearchText, translations };
}

function useRecentSearches() {
  const [recentSearches, setRecentSearches] = useState<{ term: string; lang: string }[]>([]);

  async function loadRecentSearches() {
    const recentSearchesString = await LocalStorage.getItem<string>("recentSearches");
    if (recentSearchesString) {
      setRecentSearches(JSON.parse(recentSearchesString));
    }
  }

  async function saveRecentSearches() {
    await LocalStorage.setItem("recentSearches", JSON.stringify(recentSearches));
  }

  const addRecentSearch = (term: string, lang: string) => {
    const newRecentSearches = recentSearches.filter(
      (recentSearch) => recentSearch.term !== term && recentSearch.lang !== lang
    );
    newRecentSearches.unshift({ term, lang });
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
