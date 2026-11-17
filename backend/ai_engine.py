import os
import re
import json
import requests

def call_gemini_api(prompt, api_key):
    """Calls Google Gemini API with fallback across 1.5-flash, 2.0-flash, and 1.5-pro."""
    models = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"]
    for model in models:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            payload = {
                "contents": [{
                    "parts": [{"text": prompt}]
                }],
                "generationConfig": {
                    "temperature": 0.7,
                    "maxOutputTokens": 2048
                }
            }
            res = requests.post(url, json=payload, timeout=12)
            if res.status_code == 200:
                data = res.json()
                if "candidates" in data and len(data["candidates"]) > 0:
                    parts = data["candidates"][0]["content"]["parts"]
                    text = "".join(p.get("text", "") for p in parts)
                    if text.strip():
                        return text, f"gemini ({model})"
            else:
                print(f"Gemini {model} returned status {res.status_code}: {res.text[:100]}")
        except Exception as e:
            print(f"Gemini {model} call error: {e}")
    return None, None


def generate_deep_academic_response(prompt, context):
    """Comprehensive academic problem solver, coder, and study planner."""
    p_lower = prompt.lower().strip()
    tasks = context.get('pendingTasks', [])
    exams = context.get('exams', [])
    attendance = context.get('attendance', [])
    notes = context.get('notes', [])

    # 1. STUDY SCHEDULE / DAILY TIMETABLE
    if any(k in p_lower for k in ["study plan", "schedule", "routine", "timetable", "time table", "plan my day", "daily plan"]):
        urgent_exam = exams[0] if exams else None
        top_tasks = tasks[:2]
        
        exam_line = f"📚 **Target Exam Focus**: {urgent_exam['subject']} ({urgent_exam['type']}) scheduled on **{urgent_exam['date']}**" if urgent_exam else "📚 **Target**: Core subject revision & assignments"
        task_1 = f"• **Task 1**: {top_tasks[0]['title']} ({top_tasks[0]['subject']}) [Priority: {top_tasks[0]['priority']}]" if len(top_tasks) > 0 else "• **Task 1**: Review recent lecture notes & summarize key formulas"
        task_2 = f"• **Task 2**: {top_tasks[1]['title']} ({top_tasks[1]['subject']})" if len(top_tasks) > 1 else "• **Task 2**: 30-minute practice problem set"

        return (
            f"### 📅 High-Yield Daily Study Schedule (Personalized for You)\n\n"
            f"{exam_line}\n\n"
            f"#### 🌅 Morning Session: Deep Focus & Problem Solving (9:00 AM - 11:30 AM)\n"
            f"{task_1}\n"
            f"- Use **Active Recall**: Write key concepts from memory without looking at notes.\n"
            f"- 10-minute short break at 10:15 AM.\n\n"
            f"#### ⚡ Afternoon Session: Exam Revision & Core Theory (2:00 PM - 4:30 PM)\n"
            f"- Dedicate 90 minutes to high-weightage topics for upcoming exam.\n"
            f"{task_2}\n\n"
            f"#### 🌙 Evening Session: Wrap-Up & Next-Day Planning (7:30 PM - 9:00 PM)\n"
            f"- Solve 3 practice/previous-year exam questions.\n"
            f"- Check off completed tasks in your Student Life OS task manager.\n"
            f"- 15-minute quick flashcard review before sleep."
        )

    # 2. WHAT SHOULD I STUDY TODAY / PRIORITIZATION
    if any(k in p_lower for k in ["what should i study", "what to study", "recommend", "prioritize", "priority", "where to start"]):
        high_tasks = [t for t in tasks if t['priority'] == 'High']
        urgent_exam = exams[0] if exams else None
        low_att = [a for a in attendance if a['percentage'] < 75]

        resp = "### 🎯 Your Top Academic Priorities for Today\n\n"
        step = 1
        if urgent_exam:
            resp += f"**{step}. 🚨 Nearest Exam Alert: {urgent_exam['subject']} ({urgent_exam['type']})**\n"
            resp += f"- **Date**: `{urgent_exam['date']}`\n- **Action**: Focus on highest-yield chapters and previous year questions first.\n\n"
            step += 1

        if high_tasks:
            resp += f"**{step}. 📝 Urgent Assignment: {high_tasks[0]['title']}**\n"
            resp += f"- **Subject**: {high_tasks[0]['subject']} | **Priority**: High\n- **Action**: Complete and submit this before starting lower-priority coursework.\n\n"
            step += 1
        elif tasks:
            resp += f"**{step}. 📝 Pending Coursework: {tasks[0]['title']} ({tasks[0]['subject']})**\n\n"
            step += 1

        if low_att:
            resp += f"**{step}. ⚠️ Attendance Risk Alert: {low_att[0]['name']}**\n"
            resp += f"- Current attendance is **{low_att[0]['percentage']}%** (< 75% criteria).\n- **Action**: Do not miss the upcoming 3 classes to regain exam eligibility safely.\n\n"

        resp += "💡 *Tip: Tackle the hardest topic first when your energy is highest in the morning.*"
        return resp

    # 3. ATTENDANCE & BUNK CALCULATION
    if any(k in p_lower for k in ["attendance", "bunk", "safe classes", "shortage", "eligibility", "criteria"]):
        if not attendance:
            return "You haven't logged any attendance subjects yet! Add your courses in the **📊 Attendance** tab to get live eligibility calculations."

        resp = "### 📊 Attendance & Eligibility Audit Report\n\n"
        for a in attendance:
            pct = a['percentage']
            att = a['attended']
            tot = a['total']
            if pct >= 75:
                # Calculate safe bunks: floor((attended - 0.75 * total) / 0.75)
                safe_bunks = int((att - 0.75 * tot) / 0.75)
                safe_bunks = max(0, safe_bunks)
                resp += f"• **{a['name']}**: `{pct}%` ({att}/{tot} classes) — ✅ **Eligible**\n"
                if safe_bunks > 0:
                    resp += f"  👉 *You can safely miss up to **{safe_bunks}** more classes and stay $\\ge 75\%$.*\n"
                else:
                    resp += f"  👉 *Borderline! Attend all upcoming lectures to stay safe.*\n"
            else:
                # Calculate required classes: ceil((0.75 * total - attended) / 0.25)
                needed = int((0.75 * tot - att) / 0.25) + 1
                needed = max(1, needed)
                resp += f"• **{a['name']}**: `{pct}%` ({att}/{tot} classes) — ⚠️ **Shortage Warning!**\n"
                resp += f"  👉 *Must attend the next **{needed}** consecutive lectures to restore 75% eligibility.*\n"
        return resp

    # 4. PYTHON / PROGRAMMING / ALGORITHMS / CODE EXPLANATIONS
    if any(k in p_lower for k in ["binary search", "search algorithm"]):
        return (
            "### 🔍 Binary Search Algorithm\n\n"
            "Binary Search is an efficient algorithm for searching an element in a **sorted array** with a time complexity of **O(log N)**.\n\n"
            "```python\n"
            "def binary_search(arr, target):\n"
            "    left = 0\n"
            "    right = len(arr) - 1\n"
            "    \n"
            "    while left <= right:\n"
            "        mid = (left + right) // 2\n"
            "        \n"
            "        if arr[mid] == target:\n"
            "            return mid  # Target found at index mid\n"
            "        elif arr[mid] < target:\n"
            "            left = mid + 1  # Search right half\n"
            "        else:\n"
            "            right = mid - 1  # Search left half\n"
            "            \n"
            "    return -1  # Target not found\n\n"
            "# Example Usage:\n"
            "numbers = [10, 23, 35, 48, 59, 72, 88]\n"
            "print(binary_search(numbers, 48))  # Output: 3\n"
            "```\n\n"
            "**Complexity**:\n"
            "- **Time Complexity**: Best: $O(1)$, Average/Worst: $O(\\log N)$\n"
            "- **Space Complexity**: Iterative: $O(1)$, Recursive: $O(\\log N)$"
        )

    if any(k in p_lower for k in ["quicksort", "quick sort"]):
        return (
            "### ⚡ QuickSort Algorithm\n\n"
            "QuickSort is a Divide-and-Conquer sorting algorithm that selects a **pivot** element and partitions the array around it.\n\n"
            "```python\n"
            "def quicksort(arr):\n"
            "    if len(arr) <= 1:\n"
            "        return arr\n"
            "    \n"
            "    pivot = arr[len(arr) // 2]\n"
            "    left = [x for x in arr if x < pivot]\n"
            "    middle = [x for x in arr if x == pivot]\n"
            "    right = [x for x in arr if x > pivot]\n"
            "    \n"
            "    return quicksort(left) + middle + quicksort(right)\n\n"
            "# Example Usage:\n"
            "data = [38, 27, 43, 3, 9, 82, 10]\n"
            "print(quicksort(data))  # Output: [3, 9, 10, 27, 38, 43, 82]\n"
            "```\n\n"
            "**Complexity**:\n"
            "- **Average/Best Time**: $O(N \\log N)$\n"
            "- **Worst Time**: $O(N^2)$ (when already sorted and bad pivot is chosen)\n"
            "- **Space**: $O(\\log N)$"
        )

    if any(k in p_lower for k in ["sql", "query", "highest salary", "second highest"]):
        return (
            "### 🗄️ SQL: Find N-th / 2nd Highest Salary\n\n"
            "**Approach 1: Using `LIMIT` and `OFFSET` (MySQL / PostgreSQL / SQLite)**\n"
            "```sql\n"
            "SELECT DISTINCT salary \n"
            "FROM Employee \n"
            "ORDER BY salary DESC \n"
            "LIMIT 1 OFFSET 1;\n"
            "```\n\n"
            "**Approach 2: Using Subquery (Standard ANSI SQL)**\n"
            "```sql\n"
            "SELECT MAX(salary) AS SecondHighestSalary\n"
            "FROM Employee\n"
            "WHERE salary < (SELECT MAX(salary) FROM Employee);\n"
            "```\n\n"
            "**Approach 3: Using `DENSE_RANK()` Window Function**\n"
            "```sql\n"
            "WITH RankedSalaries AS (\n"
            "    SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) as rank_num\n"
            "    FROM Employee\n"
            ")\n"
            "SELECT salary FROM RankedSalaries WHERE rank_num = 2;\n"
            "```"
        )

    # 5. CORE CS CONCEPTS
    if any(k in p_lower for k in ["normalization", "1nf", "2nf", "3nf", "bcnf"]):
        return (
            "### 📚 DBMS Normalization Explained\n\n"
            "Normalization is the process of organizing data in a database to eliminate redundancy and prevent insertion, update, and deletion anomalies.\n\n"
            "1. **1NF (First Normal Form)**:\n"
            "   - Every attribute must hold only **atomic (indivisible)** values.\n"
            "   - No repeating groups or multi-valued columns.\n\n"
            "2. **2NF (Second Normal Form)**:\n"
            "   - Must satisfy 1NF.\n"
            "   - **No Partial Dependency**: Every non-key attribute must fully depend on the complete Primary Key (relevant for composite keys).\n\n"
            "3. **3NF (Third Normal Form)**:\n"
            "   - Must satisfy 2NF.\n"
            "   - **No Transitive Dependency**: Non-key attributes must not depend on other non-key attributes ($X \\to Y$ where neither is a key).\n\n"
            "4. **BCNF (Boyce-Codd Normal Form)**:\n"
            "   - Strict 3NF: For every functional dependency $X \\to Y$, $X$ must be a **Super Key**."
        )

    if any(k in p_lower for k in ["deadlock", "coffman"]):
        return (
            "### 💻 Operating Systems: Deadlock & 4 Coffman Conditions\n\n"
            "A **Deadlock** is a situation where a set of processes are blocked because each process is holding a resource and waiting for another resource held by another process.\n\n"
            "#### 4 Necessary Conditions for Deadlock:\n"
            "1. **Mutual Exclusion**: At least one resource must be held in a non-shareable mode.\n"
            "2. **Hold and Wait**: A process must hold at least one resource and wait for additional resources.\n"
            "3. **No Preemption**: Resources cannot be forcibly taken from a process holding them.\n"
            "4. **Circular Wait**: A closed chain of processes exists where each process holds resources needed by the next ($P_1 \\to P_2 \\to P_3 \\to P_1$).\n\n"
            "#### Deadlock Handling Methods:\n"
            "- **Prevention**: Invalidate at least one of the 4 conditions.\n"
            "- **Avoidance**: Banker's Algorithm (Safe State verification).\n"
            "- **Detection & Recovery**: Resource Allocation Graph (RAG) cycle detection."
        )

    if any(k in p_lower for k in ["tcp", "3-way", "handshake", "osi", "udp"]):
        return (
            "### 🌐 Computer Networks: TCP 3-Way Handshake & OSI Model\n\n"
            "#### TCP 3-Way Handshake (Connection Establishment):\n"
            "1. **SYN (Synchronize)**: Client sends `SYN (seq = x)` to server requesting connection.\n"
            "2. **SYN-ACK**: Server acknowledges with `SYN-ACK (seq = y, ack = x + 1)`.\n"
            "3. **ACK (Acknowledge)**: Client sends `ACK (ack = y + 1)`. Reliable full-duplex connection is established.\n\n"
            "#### 7 Layers of the OSI Model:\n"
            "1. **Application** (HTTP, FTP, DNS)\n"
            "2. **Presentation** (SSL/TLS, Encryption, Data Formats)\n"
            "3. **Session** (RPC, Session Management)\n"
            "4. **Transport** (TCP, UDP - Port numbers, reliable flow control)\n"
            "5. **Network** (IP, Routing, Routers)\n"
            "6. **Data Link** (Ethernet, MAC Addresses, Switches)\n"
            "7. **Physical** (Cables, Bits, Radio Frequencies)"
        )

    if any(k in p_lower for k in ["oops", "oop", "pillar", "polymorphism", "inheritance"]):
        return (
            "### 🧩 4 Core Pillars of Object-Oriented Programming (OOP)\n\n"
            "1. **Encapsulation**: Bundling data (variables) and methods (functions) inside a single class and restricting direct access via access modifiers (`private`, `protected`, `public`).\n\n"
            "2. **Abstraction**: Hiding internal implementation details and exposing only the essential interface (e.g. `Abstract Classes` and `Interfaces`).\n\n"
            "3. **Inheritance**: Mechanism where a child class acquires properties and behavior from a parent class (`class Dog extends Animal`), promoting code reusability.\n\n"
            "4. **Polymorphism**: Ability of a message or function to take multiple forms:\n"
            "   - **Compile-Time (Static)**: Method Overloading.\n"
            "   - **Run-Time (Dynamic)**: Method Overriding with Virtual Functions."
        )

    if any(k in p_lower for k in ["react", "useeffect", "usememo", "hook"]):
        return (
            "### ⚛️ React Hooks: `useEffect` vs `useMemo` vs `useCallback`\n\n"
            "1. **`useEffect`**: Handles side-effects (API fetching, timers, DOM mutations) **after** the component renders.\n"
            "```javascript\n"
            "useEffect(() => {\n"
            "  fetchData();\n"
            "}, [dependencies]);\n"
            "```\n\n"
            "2. **`useMemo`**: Caches and returns a **memoized value** to avoid expensive recalculations on re-renders.\n"
            "```javascript\n"
            "const filteredList = useMemo(() => {\n"
            "  return items.filter(i => i.active);\n"
            "}, [items]);\n"
            "```\n\n"
            "3. **`useCallback`**: Caches a **memoized function definition** to prevent unnecessary re-creation of child callback props."
        )

    # 6. PLACEMENT & INTERVIEW PREPARATION
    if any(k in p_lower for k in ["interview", "placement", "dsa prep", "hr question", "resume"]):
        return (
            "### 💼 Top 5 Placement Interview Prep Strategy (5th Sem Focus)\n\n"
            "1. **Master Core DSA Patterns**:\n"
            "   - Two Pointers & Sliding Window\n"
            "   - Fast & Slow Pointers (Linked List cycle)\n"
            "   - BFS & DFS on Binary Trees & Graphs\n"
            "   - Top K Elements (Heaps / Priority Queue)\n\n"
            "2. **Core CS Fundamentals (Must Revise for Technical Rounds)**:\n"
            "   - **DBMS**: Normalization, SQL Joins, Indexing (B-Trees), ACID properties.\n"
            "   - **OS**: Deadlocks, Process vs Thread, Virtual Memory Paging, CPU Scheduling.\n"
            "   - **CN**: TCP vs UDP, 3-Way Handshake, DNS Resolution, REST vs GraphQL.\n"
            "   - **OOPs**: 4 Pillars with real-world coding examples.\n\n"
            "3. **STAR Method for HR & Behavioral Questions**:\n"
            "   - **S**ituation $\\to$ **T**ask $\\to$ **A**ction $\\to$ **R**esult.\n\n"
            "4. **Project Storytelling**: Be ready to explain your Student Life OS architecture, database schema, and challenges solved!"
        )

    # DEFAULT COMPREHENSIVE ACADEMIC ADVISOR RESPONSE
    urgent_count = len([t for t in tasks if t['priority'] == 'High'])
    exam_count = len(exams)
    return (
        f"### 🎓 Academic Advisor & Doubt Solver\n\n"
        f"I am ready to help you with any academic subject, coding problem, or study plan!\n\n"
        f"**Your Current Status**:\n"
        f"- 📝 **Pending Tasks**: {len(tasks)} ({urgent_count} High Priority)\n"
        f"- 📅 **Upcoming Exams**: {exam_count} scheduled\n\n"
        f"**Ask me anything, for example**:\n"
        f"1. *'Write a Python program for Binary Search / QuickSort'* \n"
        f"2. *'Explain DBMS Normalization / ACID Properties'* \n"
        f"3. *'Create a step-by-step study plan for my exams'* \n"
        f"4. *'How many classes can I miss in DBMS before shortage?'* \n"
        f"5. *'Give me top placement interview questions for 5th semester'* \n\n"
        f"Type your specific doubt or click a quick prompt below!"
    )
