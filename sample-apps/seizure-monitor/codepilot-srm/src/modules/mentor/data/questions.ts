export interface Problem {
  id: string;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
  pattern: string;
  companies: string[];
  acceptanceRate: number;
  estimatedMinutes: number;
  frequency: 'very_high' | 'high' | 'medium' | 'low';
  statement: string;
  constraints: string[];
  examples: { input: string; output: string; explanation?: string }[];
  hints: string[];
  relatedTopics: string[];
}

export const QUESTIONS: Problem[] = [
  // Arrays & Hashing
  {
    id: '1',
    title: 'Two Sum',
    difficulty: 'easy',
    topic: 'Arrays',
    pattern: 'Hash Map',
    companies: ['Google', 'Amazon', 'Meta', 'Apple'],
    acceptanceRate: 51.2,
    estimatedMinutes: 15,
    frequency: 'very_high',
    statement: 'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\nYou can return the answer in any order.',
    constraints: [
      '2 <= nums.length <= 10^4',
      '-10^9 <= nums[i] <= 10^9',
      '-10^9 <= target <= 10^9',
      'Only one valid answer exists.'
    ],
    examples: [
      { input: 'nums = [2,7,11,15], target = 9', output: '[0,1]', explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].' },
      { input: 'nums = [3,2,4], target = 6', output: '[1,2]' }
    ],
    hints: [
      'A brute force approach would be to check every pair of numbers. This would take O(n^2) time. Can we do better?',
      'If we fix one number, say `x`, we need to find if `target - x` exists in the array.',
      'What data structure provides fast lookups? A Hash Map can store numbers and their indices for O(1) retrieval.'
    ],
    relatedTopics: ['Hash Table']
  },
  {
    id: '2',
    title: 'Valid Anagram',
    difficulty: 'easy',
    topic: 'Strings',
    pattern: 'Hash Map',
    companies: ['Google', 'Uber', 'Yelp'],
    acceptanceRate: 63.2,
    estimatedMinutes: 15,
    frequency: 'high',
    statement: 'Given two strings `s` and `t`, return `true` if `t` is an anagram of `s`, and `false` otherwise.\nAn Anagram is a word or phrase formed by rearranging the letters of a different word or phrase, typically using all the original letters exactly once.',
    constraints: [
      '1 <= s.length, t.length <= 5 * 10^4',
      's and t consist of lowercase English letters.'
    ],
    examples: [
      { input: 's = "anagram", t = "nagaram"', output: 'true' },
      { input: 's = "rat", t = "car"', output: 'false' }
    ],
    hints: [
      'If the lengths of the two strings are different, can they be anagrams?',
      'Sorting both strings and comparing them takes O(n log n). Can we do it in O(n)?',
      'Try counting the frequency of each character in both strings using a hash map or an array of size 26.'
    ],
    relatedTopics: ['Sorting', 'Hash Table']
  },
  {
    id: '3',
    title: 'Group Anagrams',
    difficulty: 'medium',
    topic: 'Strings',
    pattern: 'Hash Map',
    companies: ['Amazon', 'Microsoft', 'eBay'],
    acceptanceRate: 67.2,
    estimatedMinutes: 25,
    frequency: 'high',
    statement: 'Given an array of strings `strs`, group the anagrams together. You can return the answer in any order.',
    constraints: [
      '1 <= strs.length <= 10^4',
      '0 <= strs[i].length <= 100',
      'strs[i] consists of lowercase English letters.'
    ],
    examples: [
      { input: 'strs = ["eat","tea","tan","ate","nat","bat"]', output: '[["bat"],["nat","tan"],["ate","eat","tea"]]' },
      { input: 'strs = [""]', output: '[[""]]' }
    ],
    hints: [
      'How can we uniquely identify a group of anagrams? What do all anagrams of "eat" have in common?',
      'If you sort the letters of any anagram of "eat", you will always get "aet". We can use this sorted string as a key in a hash map.',
      'Alternatively, use a character count array of size 26 as the key to avoid the O(k log k) sorting overhead per string.'
    ],
    relatedTopics: ['Hash Table', 'Sorting']
  },
  {
    id: '4',
    title: 'Top K Frequent Elements',
    difficulty: 'medium',
    topic: 'Arrays',
    pattern: 'Bucket Sort',
    companies: ['Amazon', 'Meta', 'Yelp'],
    acceptanceRate: 64.1,
    estimatedMinutes: 30,
    frequency: 'high',
    statement: 'Given an integer array `nums` and an integer `k`, return the `k` most frequent elements. You may return the answer in any order.',
    constraints: [
      '1 <= nums.length <= 10^5',
      '-10^4 <= nums[i] <= 10^4',
      'k is in the range [1, the number of unique elements in the array].',
      'It is guaranteed that the answer is unique.'
    ],
    examples: [
      { input: 'nums = [1,1,1,2,2,3], k = 2', output: '[1,2]' },
      { input: 'nums = [1], k = 1', output: '[1]' }
    ],
    hints: [
      'First, count the frequencies of each number using a hash map.',
      'You could use a Max Heap or sort the map by values, but that takes O(n log n) or O(n log k).',
      'Can you use bucket sort? Create an array of lists where the index represents the frequency.'
    ],
    relatedTopics: ['Hash Table', 'Heap (Priority Queue)', 'Sorting', 'Counting', 'Divide and Conquer', 'Quickselect', 'Bucket Sort']
  },
  {
    id: '5',
    title: 'Product of Array Except Self',
    difficulty: 'medium',
    topic: 'Arrays',
    pattern: 'Prefix Sum',
    companies: ['Amazon', 'Microsoft', 'Apple', 'Meta'],
    acceptanceRate: 65.1,
    estimatedMinutes: 30,
    frequency: 'very_high',
    statement: 'Given an integer array `nums`, return an array `answer` such that `answer[i]` is equal to the product of all the elements of `nums` except `nums[i]`.\nThe product of any prefix or suffix of `nums` is guaranteed to fit in a 32-bit integer.\nYou must write an algorithm that runs in O(n) time and without using the division operation.',
    constraints: [
      '2 <= nums.length <= 10^5',
      '-30 <= nums[i] <= 30'
    ],
    examples: [
      { input: 'nums = [1,2,3,4]', output: '[24,12,8,6]' },
      { input: 'nums = [-1,1,0,-3,3]', output: '[0,0,9,0,0]' }
    ],
    hints: [
      'Since we cannot use division, we need to multiply all elements before `i` and all elements after `i`.',
      'Compute a prefix product array and a postfix product array.',
      'To achieve O(1) extra space, calculate the prefix products directly into the answer array, then multiply by a running postfix product.'
    ],
    relatedTopics: ['Array', 'Prefix Sum']
  },
  
  // Two Pointers
  {
    id: '6',
    title: 'Valid Palindrome',
    difficulty: 'easy',
    topic: 'Strings',
    pattern: 'Two Pointers',
    companies: ['Meta', 'Spotify', 'Amazon'],
    acceptanceRate: 46.2,
    estimatedMinutes: 15,
    frequency: 'high',
    statement: 'A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward. Alphanumeric characters include letters and numbers.\nGiven a string `s`, return `true` if it is a palindrome, or `false` otherwise.',
    constraints: [
      '1 <= s.length <= 2 * 10^5',
      's consists only of printable ASCII characters.'
    ],
    examples: [
      { input: 's = "A man, a plan, a canal: Panama"', output: 'true', explanation: '"amanaplanacanalpanama" is a palindrome.' },
      { input: 's = "race a car"', output: 'false', explanation: '"raceacar" is not a palindrome.' }
    ],
    hints: [
      'Use two pointers, one at the beginning and one at the end of the string.',
      'Move both pointers towards the center, skipping any non-alphanumeric characters.',
      'Compare the lowercase versions of the characters at the pointers. If they differ, it is not a palindrome.'
    ],
    relatedTopics: ['Two Pointers', 'String']
  },
  {
    id: '7',
    title: '3Sum',
    difficulty: 'medium',
    topic: 'Arrays',
    pattern: 'Two Pointers',
    companies: ['Meta', 'Amazon', 'Apple'],
    acceptanceRate: 33.3,
    estimatedMinutes: 35,
    frequency: 'very_high',
    statement: 'Given an integer array nums, return all the triplets `[nums[i], nums[j], nums[k]]` such that `i != j`, `i != k`, and `j != k`, and `nums[i] + nums[j] + nums[k] == 0`.\nNotice that the solution set must not contain duplicate triplets.',
    constraints: [
      '3 <= nums.length <= 3000',
      '-10^5 <= nums[i] <= 10^5'
    ],
    examples: [
      { input: 'nums = [-1,0,1,2,-1,-4]', output: '[[-1,-1,2],[-1,0,1]]', explanation: 'The distinct triplets are [-1,0,1] and [-1,-1,2].' },
      { input: 'nums = [0,1,1]', output: '[]' }
    ],
    hints: [
      'Sorting the array first makes it easier to avoid duplicates and use two pointers.',
      'Iterate through the array, fixing the first element `nums[i]`. Then, solve the Two Sum II problem on the remaining elements.',
      'Be careful to skip duplicate values for both the fixed element and the two pointers to ensure unique triplets.'
    ],
    relatedTopics: ['Array', 'Two Pointers', 'Sorting']
  },
  {
    id: '8',
    title: 'Container With Most Water',
    difficulty: 'medium',
    topic: 'Arrays',
    pattern: 'Two Pointers',
    companies: ['Amazon', 'Google', 'Meta'],
    acceptanceRate: 54.0,
    estimatedMinutes: 30,
    frequency: 'high',
    statement: 'You are given an integer array `height` of length `n`. There are `n` vertical lines drawn such that the two endpoints of the `ith` line are `(i, 0)` and `(i, height[i])`.\nFind two lines that together with the x-axis form a container, such that the container contains the most water.\nReturn the maximum amount of water a container can store.',
    constraints: [
      'n == height.length',
      '2 <= n <= 10^5',
      '0 <= height[i] <= 10^4'
    ],
    examples: [
      { input: 'height = [1,8,6,2,5,4,8,3,7]', output: '49', explanation: 'The vertical lines at index 1 and 8 form the max container of size 7 * 7 = 49.' },
      { input: 'height = [1,1]', output: '1' }
    ],
    hints: [
      'The area is determined by the minimum height of the two lines multiplied by the distance between them.',
      'Start with two pointers at the widest possible container (index 0 and n-1).',
      'To potentially find a larger area, move the pointer that points to the shorter line inward.'
    ],
    relatedTopics: ['Array', 'Two Pointers', 'Greedy']
  },

  // Sliding Window
  {
    id: '9',
    title: 'Best Time to Buy and Sell Stock',
    difficulty: 'easy',
    topic: 'Arrays',
    pattern: 'Sliding Window',
    companies: ['Amazon', 'Microsoft', 'Bloomberg'],
    acceptanceRate: 54.3,
    estimatedMinutes: 20,
    frequency: 'very_high',
    statement: 'You are given an array `prices` where `prices[i]` is the price of a given stock on the `ith` day.\nYou want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock.\nReturn the maximum profit you can achieve from this transaction. If you cannot achieve any profit, return 0.',
    constraints: [
      '1 <= prices.length <= 10^5',
      '0 <= prices[i] <= 10^4'
    ],
    examples: [
      { input: 'prices = [7,1,5,3,6,4]', output: '5', explanation: 'Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 6-1 = 5.' },
      { input: 'prices = [7,6,4,3,1]', output: '0', explanation: 'No transactions are done.' }
    ],
    hints: [
      'You need to find the largest difference between two elements such that the smaller element comes before the larger one.',
      'Keep track of the minimum price seen so far as you iterate through the array.',
      'Calculate the potential profit if you sold on the current day, and update the maximum profit.'
    ],
    relatedTopics: ['Array', 'Dynamic Programming']
  },
  {
    id: '10',
    title: 'Longest Substring Without Repeating Characters',
    difficulty: 'medium',
    topic: 'Strings',
    pattern: 'Sliding Window',
    companies: ['Amazon', 'Meta', 'Microsoft'],
    acceptanceRate: 34.1,
    estimatedMinutes: 35,
    frequency: 'very_high',
    statement: 'Given a string `s`, find the length of the longest substring without repeating characters.',
    constraints: [
      '0 <= s.length <= 5 * 10^4',
      's consists of English letters, digits, symbols and spaces.'
    ],
    examples: [
      { input: 's = "abcabcbb"', output: '3', explanation: 'The answer is "abc", with the length of 3.' },
      { input: 's = "bbbbb"', output: '1', explanation: 'The answer is "b", with the length of 1.' }
    ],
    hints: [
      'Use a sliding window with two pointers: left and right.',
      'Use a hash set to keep track of characters in the current window.',
      'If you encounter a character already in the set, move the left pointer forward until the duplicate is removed.'
    ],
    relatedTopics: ['Hash Table', 'String', 'Sliding Window']
  },

  // Binary Search
  {
    id: '11',
    title: 'Binary Search',
    difficulty: 'easy',
    topic: 'Binary Search',
    pattern: 'Binary Search',
    companies: ['Microsoft', 'Apple', 'Google'],
    acceptanceRate: 56.4,
    estimatedMinutes: 10,
    frequency: 'high',
    statement: 'Given an array of integers `nums` which is sorted in ascending order, and an integer `target`, write a function to search `target` in `nums`. If `target` exists, then return its index. Otherwise, return -1.\nYou must write an algorithm with O(log n) runtime complexity.',
    constraints: [
      '1 <= nums.length <= 10^4',
      '-10^4 < nums[i], target < 10^4',
      'All the integers in nums are unique.',
      'nums is sorted in ascending order.'
    ],
    examples: [
      { input: 'nums = [-1,0,3,5,9,12], target = 9', output: '4' },
      { input: 'nums = [-1,0,3,5,9,12], target = 2', output: '-1' }
    ],
    hints: [
      'Use two pointers, low and high, initialized to the bounds of the array.',
      'Find the middle element. If it is the target, you are done.',
      'If the middle element is less than target, search the right half. Otherwise, search the left half.'
    ],
    relatedTopics: ['Array', 'Binary Search']
  },
  {
    id: '12',
    title: 'Search in Rotated Sorted Array',
    difficulty: 'medium',
    topic: 'Binary Search',
    pattern: 'Binary Search',
    companies: ['Amazon', 'Meta', 'Microsoft', 'LinkedIn'],
    acceptanceRate: 39.4,
    estimatedMinutes: 30,
    frequency: 'high',
    statement: 'There is an integer array `nums` sorted in ascending order (with distinct values).\nPrior to being passed to your function, `nums` is possibly rotated at an unknown pivot index `k` `(1 <= k < nums.length)` such that the resulting array is `[nums[k], nums[k+1], ..., nums[n-1], nums[0], nums[1], ..., nums[k-1]]`.\nGiven the array `nums` after the possible rotation and an integer `target`, return the index of `target` if it is in `nums`, or -1 if it is not in `nums`.\nYou must write an algorithm with O(log n) runtime complexity.',
    constraints: [
      '1 <= nums.length <= 5000',
      '-10^4 <= nums[i] <= 10^4',
      'All values of nums are unique.',
      'nums is an ascending array that is possibly rotated.',
      '-10^4 <= target <= 10^4'
    ],
    examples: [
      { input: 'nums = [4,5,6,7,0,1,2], target = 0', output: '4' },
      { input: 'nums = [4,5,6,7,0,1,2], target = 3', output: '-1' }
    ],
    hints: [
      'In a rotated sorted array, one half of the array will always be sorted.',
      'Find the middle element. Check which half is sorted (nums[low] <= nums[mid]).',
      'If the left half is sorted, check if target falls within its range. If so, search left; else, search right. Repeat the logic for the right half.'
    ],
    relatedTopics: ['Array', 'Binary Search']
  },

  // Trees
  {
    id: '13',
    title: 'Maximum Depth of Binary Tree',
    difficulty: 'easy',
    topic: 'Trees',
    pattern: 'DFS',
    companies: ['LinkedIn', 'Amazon', 'Spotify'],
    acceptanceRate: 74.2,
    estimatedMinutes: 15,
    frequency: 'high',
    statement: 'Given the `root` of a binary tree, return its maximum depth.\nA binary tree\'s maximum depth is the number of nodes along the longest path from the root node down to the farthest leaf node.',
    constraints: [
      'The number of nodes in the tree is in the range [0, 10^4].',
      '-100 <= Node.val <= 100'
    ],
    examples: [
      { input: 'root = [3,9,20,null,null,15,7]', output: '3' },
      { input: 'root = [1,null,2]', output: '2' }
    ],
    hints: [
      'If the tree is empty (root is null), the depth is 0.',
      'Otherwise, the depth is 1 + the maximum of the depths of the left and right subtrees.',
      'This naturally leads to a recursive Depth-First Search (DFS) solution.'
    ],
    relatedTopics: ['Tree', 'Depth-First Search', 'Breadth-First Search', 'Binary Tree']
  },
  {
    id: '14',
    title: 'Lowest Common Ancestor of a Binary Search Tree',
    difficulty: 'medium',
    topic: 'Trees',
    pattern: 'DFS',
    companies: ['Amazon', 'Google', 'Meta'],
    acceptanceRate: 63.8,
    estimatedMinutes: 25,
    frequency: 'high',
    statement: 'Given a binary search tree (BST), find the lowest common ancestor (LCA) node of two given nodes in the BST.\nThe lowest common ancestor is defined between two nodes `p` and `q` as the lowest node in `T` that has both `p` and `q` as descendants (where we allow a node to be a descendant of itself).',
    constraints: [
      'The number of nodes in the tree is in the range [2, 10^5].',
      '-10^9 <= Node.val <= 10^9',
      'All Node.val are unique.',
      'p != q',
      'p and q will exist in the BST.'
    ],
    examples: [
      { input: 'root = [6,2,8,0,4,7,9,null,null,3,5], p = 2, q = 8', output: '6', explanation: 'The LCA of nodes 2 and 8 is 6.' },
      { input: 'root = [6,2,8,0,4,7,9,null,null,3,5], p = 2, q = 4', output: '2', explanation: 'The LCA of nodes 2 and 4 is 2, since a node can be a descendant of itself.' }
    ],
    hints: [
      'Take advantage of the BST property: left children are smaller, right children are larger.',
      'If both p and q are smaller than the root, the LCA must be in the left subtree.',
      'If both p and q are larger than the root, the LCA must be in the right subtree.',
      'If p and q are on opposite sides of the root, then the root is the LCA.'
    ],
    relatedTopics: ['Tree', 'Depth-First Search', 'Binary Search Tree', 'Binary Tree']
  },

  // Graphs
  {
    id: '15',
    title: 'Number of Islands',
    difficulty: 'medium',
    topic: 'Graphs',
    pattern: 'BFS/DFS',
    companies: ['Amazon', 'Microsoft', 'Google', 'Meta'],
    acceptanceRate: 58.4,
    estimatedMinutes: 30,
    frequency: 'very_high',
    statement: 'Given an `m x n` 2D binary grid `grid` which represents a map of `1`s (land) and `0`s (water), return the number of islands.\nAn island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically. You may assume all four edges of the grid are all surrounded by water.',
    constraints: [
      'm == grid.length',
      'n == grid[i].length',
      '1 <= m, n <= 300',
      'grid[i][j] is "0" or "1".'
    ],
    examples: [
      { input: 'grid = [\n  ["1","1","1","1","0"],\n  ["1","1","0","1","0"],\n  ["1","1","0","0","0"],\n  ["0","0","0","0","0"]\n]', output: '1' },
      { input: 'grid = [\n  ["1","1","0","0","0"],\n  ["1","1","0","0","0"],\n  ["0","0","1","0","0"],\n  ["0","0","0","1","1"]\n]', output: '3' }
    ],
    hints: [
      'Iterate through the grid. When you find a "1", you have found an island.',
      'Use DFS or BFS to visit all connected land cells and mark them as visited (e.g., change "1" to "0").',
      'Increment your island count and continue searching the grid for unvisited land.'
    ],
    relatedTopics: ['Array', 'Depth-First Search', 'Breadth-First Search', 'Union Find', 'Matrix']
  },

  // Dynamic Programming
  {
    id: '16',
    title: 'Climbing Stairs',
    difficulty: 'easy',
    topic: 'Dynamic Programming',
    pattern: 'Fibonacci',
    companies: ['Amazon', 'Google', 'Apple'],
    acceptanceRate: 52.3,
    estimatedMinutes: 20,
    frequency: 'high',
    statement: 'You are climbing a staircase. It takes `n` steps to reach the top.\nEach time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?',
    constraints: [
      '1 <= n <= 45'
    ],
    examples: [
      { input: 'n = 2', output: '2', explanation: '1. 1 step + 1 step\n2. 2 steps' },
      { input: 'n = 3', output: '3', explanation: '1. 1 step + 1 step + 1 step\n2. 1 step + 2 steps\n3. 2 steps + 1 step' }
    ],
    hints: [
      'To reach step `n`, you could have jumped from step `n-1` (1 step jump) or from step `n-2` (2 step jump).',
      'Therefore, the number of ways to reach step `n` is ways(n) = ways(n-1) + ways(n-2).',
      'This is the Fibonacci sequence. You can optimize space by only storing the last two values instead of an entire array.'
    ],
    relatedTopics: ['Math', 'Dynamic Programming', 'Memoization']
  },
  
  // Backtracking
  {
    id: '17',
    title: 'Subsets',
    difficulty: 'medium',
    topic: 'Backtracking',
    pattern: 'Backtracking',
    companies: ['Meta', 'Amazon', 'Bloomberg'],
    acceptanceRate: 75.9,
    estimatedMinutes: 25,
    frequency: 'high',
    statement: 'Given an integer array `nums` of unique elements, return all possible subsets (the power set).\nThe solution set must not contain duplicate subsets. Return the solution in any order.',
    constraints: [
      '1 <= nums.length <= 10',
      '-10 <= nums[i] <= 10',
      'All the numbers of nums are unique.'
    ],
    examples: [
      { input: 'nums = [1,2,3]', output: '[[],[1],[2],[1,2],[3],[1,3],[2,3],[1,2,3]]' },
      { input: 'nums = [0]', output: '[[],[0]]' }
    ],
    hints: [
      'For each element, you have a choice: include it in the current subset or exclude it.',
      'Use a recursive backtracking function to explore both choices for every element.',
      'Keep track of the current path (subset) and add a copy of it to the result array at each step.'
    ],
    relatedTopics: ['Array', 'Backtracking', 'Bit Manipulation']
  },
  
  // Heap / Priority Queue
  {
    id: '18',
    title: 'Kth Largest Element in an Array',
    difficulty: 'medium',
    topic: 'Heap',
    pattern: 'Top K Elements',
    companies: ['Meta', 'Amazon', 'Microsoft'],
    acceptanceRate: 66.8,
    estimatedMinutes: 25,
    frequency: 'high',
    statement: 'Given an integer array `nums` and an integer `k`, return the `kth` largest element in the array.\nNote that it is the `kth` largest element in the sorted order, not the `kth` distinct element.\nCan you solve it without sorting?',
    constraints: [
      '1 <= k <= nums.length <= 10^5',
      '-10^4 <= nums[i] <= 10^4'
    ],
    examples: [
      { input: 'nums = [3,2,1,5,6,4], k = 2', output: '5' },
      { input: 'nums = [3,2,3,1,2,4,5,5,6], k = 4', output: '4' }
    ],
    hints: [
      'Sorting takes O(n log n). Can we do better?',
      'Maintain a min-heap of size `k`. Iterate through the array, adding elements to the heap.',
      'If the heap size exceeds `k`, pop the smallest element. At the end, the root of the min-heap is the kth largest element. Time: O(n log k).'
    ],
    relatedTopics: ['Array', 'Divide and Conquer', 'Sorting', 'Heap (Priority Queue)', 'Quickselect']
  }
];
