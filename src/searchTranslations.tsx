import { Action, ActionPanel, Icon, List, LocalStorage, useNavigation } from "@raycast/api";
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
                  <Action
                    title="Show Translation"
                    onAction={() => {
                      navigation.push(<WordTranslation word={recentSearch.term} lang={recentSearch.lang} />);
                    }}
                  />
                  <Action.OpenInBrowser
                    url={`https://www.wordreference.com/${recentSearch.lang === "fr" ? "fren" : "enfr"}/${
                      recentSearch.term
                    }`}
                  />
                  <Action
                    title="Delete"
                    onAction={() => {
                      removeRecentSearch(index);
                    }}
                    icon={Icon.Trash}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                  />
                  <Action
                    title="Delete All"
                    onAction={() => {
                      clearRecentSearches();
                    }}
                    icon={Icon.Eraser}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                  />
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
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
  };

  useEffect(() => {
    loadRecentSearches();
  }, []);

  useEffect(() => {
    saveRecentSearches();
  }, [recentSearches]);

  return { recentSearches, addRecentSearch, removeRecentSearch, clearRecentSearches };
}
