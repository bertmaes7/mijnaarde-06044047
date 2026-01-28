import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTags, Tag } from "@/hooks/useTags";
import { X, Plus, Tag as TagIcon, ChevronDown, Loader2 } from "lucide-react";

interface TagFilterProps {
  selectedTagIds: string[];
  onTagsChange: (tagIds: string[]) => void;
}

export function TagFilter({ selectedTagIds, onTagsChange }: TagFilterProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  
  const { data: allTags = [], isLoading } = useTags();

  const selectedTags = allTags.filter(t => selectedTagIds.includes(t.id));
  const availableTags = allTags.filter(t => !selectedTagIds.includes(t.id));
  
  // Filter tags based on input
  const filteredTags = availableTags.filter(tag =>
    tag.name.toLowerCase().includes(inputValue.toLowerCase())
  );

  const handleSelectTag = (tag: Tag) => {
    onTagsChange([...selectedTagIds, tag.id]);
    setInputValue("");
  };

  const handleRemoveTag = (tagId: string) => {
    onTagsChange(selectedTagIds.filter(id => id !== tagId));
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Selected tags */}
      {selectedTags.map((tag) => (
        <Badge
          key={tag.id}
          variant="secondary"
          className="gap-1 pr-1"
        >
          {tag.name}
          <button
            type="button"
            onClick={() => handleRemoveTag(tag.id)}
            className="ml-1 hover:bg-muted rounded p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      {/* Add tag filter */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1"
          >
            {isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <TagIcon className="h-3 w-3" />
            )}
            Tags
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Zoek tag..."
              value={inputValue}
              onValueChange={setInputValue}
            />
            <CommandList>
              <CommandEmpty>
                <span className="text-muted-foreground text-sm">Geen tags gevonden</span>
              </CommandEmpty>
              <CommandGroup>
                {filteredTags.map((tag) => (
                  <CommandItem
                    key={tag.id}
                    value={tag.name}
                    onSelect={() => {
                      handleSelectTag(tag);
                      setOpen(false);
                    }}
                  >
                    <TagIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                    {tag.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
