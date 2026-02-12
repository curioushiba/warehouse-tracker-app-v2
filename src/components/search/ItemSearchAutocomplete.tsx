"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { SearchInput } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { ItemImage } from "@/components/items/ItemImage";
import { useDebounce } from "@/hooks";
import { searchItems } from "@/lib/actions";
import type { Item } from "@/lib/supabase/types";
import type { ActionResult } from "@/lib/types/action-result";

export interface ItemSearchAutocompleteProps {
  /** Called when user selects an item from the dropdown */
  onItemSelect: (item: Item) => void;
  /** Optional function to check if item is already in batch */
  isItemInBatch?: (itemId: string) => boolean;
  /** Placeholder text for input */
  placeholder?: string;
  /** Minimum characters before search triggers (default: 2) */
  minCharacters?: number;
  /** Debounce delay in ms (default: 300) */
  debounceMs?: number;
  /** Auto focus input on mount */
  autoFocus?: boolean;
  /** Additional className for container */
  className?: string;
  /** Optional category ID to filter search results */
  categoryId?: string;
  /** Optional custom search function (defaults to searchItems) */
  searchFn?: (query: string, categoryId?: string) => Promise<ActionResult<Item[]>>;
}

export function ItemSearchAutocomplete({
  onItemSelect,
  isItemInBatch,
  placeholder = "Enter SKU, barcode, or name",
  minCharacters = 2,
  debounceMs = 300,
  autoFocus = false,
  className,
  categoryId,
  searchFn,
}: ItemSearchAutocompleteProps) {
  // Search state
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<Item[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Dropdown state
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);

  // Refs
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);
  const requestIdRef = React.useRef(0);

  // Debounced search query
  const debouncedQuery = useDebounce(searchQuery.trim(), debounceMs);

  // Search effect with race condition prevention
  React.useEffect(() => {
    // Reset if query too short
    if (debouncedQuery.length < minCharacters) {
      setSearchResults([]);
      setIsDropdownOpen(false);
      setHighlightedIndex(-1);
      return;
    }

    // Increment request ID to track this specific request
    const currentRequestId = ++requestIdRef.current;

    async function performSearch() {
      setIsSearching(true);
      setError(null);

      try {
        const search = searchFn ?? searchItems;
        const result = await search(debouncedQuery, categoryId);

        // Discard if a newer request was made while this one was in flight
        if (currentRequestId !== requestIdRef.current) return;

        if (result.success) {
          setSearchResults(result.data || []);
          setIsDropdownOpen(true);
          setHighlightedIndex(-1);
        } else {
          setError(result.error || "Search failed");
          setSearchResults([]);
          setIsDropdownOpen(true); // Show dropdown to display error
        }
      } catch {
        // Discard stale error responses too
        if (currentRequestId !== requestIdRef.current) return;
        setError("Search failed");
        setSearchResults([]);
        setIsDropdownOpen(true); // Show dropdown to display error
      } finally {
        // Only update loading state if this is still the current request
        if (currentRequestId === requestIdRef.current) {
          setIsSearching(false);
        }
      }
    }

    performSearch();
  }, [debouncedQuery, minCharacters, categoryId, searchFn]);

  // Handle item selection
  const handleItemSelect = React.useCallback(
    (item: Item) => {
      onItemSelect(item);
      setSearchQuery("");
      setSearchResults([]);
      setIsDropdownOpen(false);
      setHighlightedIndex(-1);
      // Refocus input for quick subsequent scans
      inputRef.current?.focus();
    },
    [onItemSelect]
  );

  // Keyboard navigation
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (!isDropdownOpen || searchResults.length === 0) {
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev < searchResults.length - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
          break;
        case "Enter":
          e.preventDefault();
          if (highlightedIndex >= 0 && searchResults[highlightedIndex]) {
            handleItemSelect(searchResults[highlightedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          setIsDropdownOpen(false);
          setHighlightedIndex(-1);
          break;
      }
    },
    [isDropdownOpen, searchResults, highlightedIndex, handleItemSelect]
  );

  // Scroll highlighted item into view
  React.useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const highlightedElement = listRef.current.children[
        highlightedIndex
      ] as HTMLElement;
      if (highlightedElement?.scrollIntoView) {
        highlightedElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex]);

  // Click outside handler
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
        setHighlightedIndex(-1);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle input focus - reopen dropdown if results exist
  const handleFocus = React.useCallback(() => {
    if (searchResults.length > 0) {
      setIsDropdownOpen(true);
    }
  }, [searchResults.length]);

  // Handle clear
  const handleClear = React.useCallback(() => {
    setSearchQuery("");
    setSearchResults([]);
    setIsDropdownOpen(false);
    setHighlightedIndex(-1);
    setError(null);
  }, []);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Search Input */}
      <SearchInput
        ref={inputRef}
        placeholder={placeholder}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onClear={handleClear}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        autoFocus={autoFocus}
        inputMode="search"
        autoComplete="off"
        role="combobox"
        aria-expanded={isDropdownOpen}
        aria-haspopup="listbox"
        aria-controls="item-search-listbox"
        aria-activedescendant={
          highlightedIndex >= 0 ? `item-option-${highlightedIndex}` : undefined
        }
      />

      {/* Loading indicator */}
      {isSearching && (
        <div className="absolute right-10 top-1/2 -translate-y-1/2">
          <Spinner size="sm" />
        </div>
      )}

      {/* Dropdown */}
      {isDropdownOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white rounded-lg border border-neutral-200 shadow-lg overflow-hidden">
          {/* Error state */}
          {error && (
            <div className="p-4 text-center text-error text-sm">{error}</div>
          )}

          {/* Empty state */}
          {!error && !isSearching && searchResults.length === 0 && (
            <div className="p-4 text-center text-foreground-muted text-sm">
              No items found for &quot;{debouncedQuery}&quot;
            </div>
          )}

          {/* Results list */}
          {searchResults.length > 0 && (
            <ul
              ref={listRef}
              id="item-search-listbox"
              role="listbox"
              className="max-h-64 overflow-y-auto"
            >
              {searchResults.map((item, index) => {
                const isInBatch = isItemInBatch?.(item.id) ?? false;
                const isHighlighted = index === highlightedIndex;

                return (
                  <li
                    key={item.id}
                    id={`item-option-${index}`}
                    role="option"
                    aria-selected={isHighlighted}
                    className={cn(
                      "flex items-center justify-between px-3 py-3 cursor-pointer transition-colors",
                      "min-h-[48px]", // Mobile-friendly tap target
                      isHighlighted
                        ? "bg-primary-50"
                        : "hover:bg-neutral-50 active:bg-neutral-100"
                    )}
                    onClick={() => handleItemSelect(item)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    {/* Left: Image + Item info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <ItemImage
                        imageUrl={item.image_url}
                        itemName={item.name}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">
                          {item.name}
                        </p>
                        <p className="text-xs text-foreground-muted truncate">
                          {item.sku}
                        </p>
                      </div>
                    </div>

                    {/* Right: Stock + In list badge */}
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <Badge colorScheme="neutral" size="sm">
                        {item.current_stock} {item.unit}
                      </Badge>
                      {isInBatch && (
                        <Badge colorScheme="success" size="sm">
                          In list
                        </Badge>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default ItemSearchAutocomplete;
