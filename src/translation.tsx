import { Action, ActionPanel, Detail, Icon, List, LocalStorage, useNavigation } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import * as cheerio from "cheerio";
import { useEffect, useMemo, useState } from "react";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const navigation = useNavigation();
  const [recentSearches, setRecentSearches] = useState<{ term: string; lang: string }[]>([]);

  async function loadRecentSearches() {
    const recentSearchesString = await LocalStorage.getItem<string>("recentSearches");
    console.log("recentSearchesString: ", recentSearchesString);
    if (recentSearchesString) {
      setRecentSearches(JSON.parse(recentSearchesString));
    }
  }

  async function saveRecentSearches() {
    await LocalStorage.setItem("recentSearches", JSON.stringify(recentSearches));
    const recentSearchesString = await LocalStorage.getItem<string>("recentSearches");
    console.log("recentSearchesString: ", recentSearchesString);
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

  const { data } = useFetch<string>("https://www.wordreference.com/autocomplete?dict=fren&query=" + searchText, {
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

function WordTranslation({ word, lang }: { word: string; lang: string }) {
  const url = `https://www.wordreference.com/${lang === "fr" ? "fren" : "enfr"}/${word}`;
  const { data: rawData, isLoading } = useFetch<string>(url, {
    method: "GET",
    keepPreviousData: true,
  });
  const markdown = useMemo(() => {
    if (isLoading) {
      return "Loading...";
    }
    if (!rawData) {
      return "Not found";
    }
    const data = parseRawData(rawData);
    let markdown = "";
    console.log("generating markdown with data: ", data);

    data.forEach((item) => {
      // Add term
      markdown += `### **${item.from.term}** *${item.from.type}*\n`;
      markdown += `*${item.from.definition}*\n\n`;

      // Add translations
      item.to.forEach((toItem) => {
        markdown += `- **${toItem.term}** (${toItem.type})\n`;
        markdown += `  *${toItem.definition}*\n`;
      });
      markdown += "\n";

      if (item.example && Object.keys(item.example).length) {
        markdown += `> ${item.example.from}\n`;
        markdown += `> ${item.example.to}\n\n`;
      }
    });
    return markdown;
  }, [rawData, isLoading]);

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={word}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={url} />
        </ActionPanel>
      }
    />
  );
}

function parseRawData(rawData: string): Translation[] {
  const $ = cheerio.load(rawData);

  const data: Translation[] = [];
  let currentTranslation: Translation | null = null;

  // Loop through each 'tr' in the div with the id 'articleWRD'
  $("#articleWRD tr").each((_, element) => {
    // If the tr has an id, it's the start of a new translation
    if ($(element).attr("id")) {
      // If there is a current translation, push it to data
      if (currentTranslation) {
        data.push(currentTranslation);
      }

      // Start a new translation
      const fromTerm = $(element).find(".FrWrd strong").text().trim();
      const fromType = $(element).find(".FrWrd .POS2").text().trim();
      const toDefinition = $(element).find("td:eq(1) .dense").text().trim();

      $(element).find("td:eq(1) span.dense").remove();
      const fromDefinition = $(element).find("td:eq(1)").text().trim();
      const toTerm = $(element).find(".ToWrd").text().trim();
      const toType = $(element).find(".ToWrd .POS2").text().trim();

      currentTranslation = {
        from: {
          term: fromTerm,
          type: fromType,
          definition: fromDefinition,
        },
        to: [
          {
            term: toTerm,
            type: toType,
            definition: toDefinition,
          },
        ],
        example: undefined,
      };
    } else if (currentTranslation) {
      // If the tr does not have an id, it's a continuation of the current translation

      // Get 'to' words
      const toTerm = $(element).find(".ToWrd").text().trim();
      const toType = $(element).find(".ToWrd .POS2").text().trim();
      const toDefinition = $(element).find(".To2 span").text().trim();

      if (toTerm) {
        currentTranslation.to.push({
          term: toTerm,
          type: toType,
          definition: toDefinition,
        });
      }

      // Get 'example' object
      const fromExample = $(element).find(".FrEx").text().trim();
      const toExample = $(element).find(".ToEx").text().trim();
      if (fromExample && toExample) {
        currentTranslation.example = {
          from: fromExample,
          to: toExample,
        };
      }
    }
  });

  // If there is a current translation after the loop, push it to data
  if (currentTranslation) {
    data.push(currentTranslation);
  }

  return data;
}

interface Translation {
  from: Word;
  to: Word[];
  example?: Example;
}

interface Word {
  term: string;
  type: string;
  definition: string;
}
interface Example {
  from: string;
  to: string;
}
