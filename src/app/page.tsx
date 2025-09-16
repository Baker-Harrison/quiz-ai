import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      <header className="mb-10">
        <h1 className="text-3xl font-semibold">Quiz AI</h1>
        <p className="text-gray-600 mt-2">Create learning objectives, generate quizzes with Gemini, and get AI feedback.</p>
      </header>

      <div className="grid sm:grid-cols-2 gap-4">
        <Link href="/objectives" className="border rounded p-6 hover:bg-gray-50">
          <h2 className="font-medium">Objectives</h2>
          <p className="text-sm text-gray-600">Add, edit, and delete learning objectives.</p>
        </Link>
        <Link href="/quiz" className="border rounded p-6 hover:bg-gray-50">
          <h2 className="font-medium">Generate Quiz</h2>
          <p className="text-sm text-gray-600">Create a quiz from your objectives using Gemini.</p>
        </Link>
        <Link href="/insights" className="border rounded p-6 hover:bg-gray-50">
          <h2 className="font-medium">Insights</h2>
          <p className="text-sm text-gray-600">Review strong/weak points and study plan from your last quiz.</p>
        </Link>
        <Link href="/practice" className="border rounded p-6 hover:bg-gray-50">
          <h2 className="font-medium">Practice</h2>
          <p className="text-sm text-gray-600">Generate targeted practice from your weak points.</p>
        </Link>
      </div>
    </div>
  );
}
