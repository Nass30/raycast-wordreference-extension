import { Action, ActionPanel, Detail } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useMemo } from "react";
import * as cheerio from "cheerio";

export function WordTranslation({ word, lang }: { word: string; lang: string }) {
  const { isLoading, markdown, url } = useWordTranslation({ word, lang });

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

function useWordTranslation({ word, lang }: { word: string; lang: string }) {
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

  return { url, isLoading, markdown };
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
