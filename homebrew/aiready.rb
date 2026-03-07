# AIReady Homebrew Formula
# Install with: brew install aiready

class Aiready < Formula
  desc "AI readiness analysis tools - detect issues that confuse AI models"
  homepage "https://getaiready.dev"
  url "https://registry.npmjs.org/@aiready/cli/-/cli-0.12.16.tgz"
  sha256 "374a7710dba727d105f4a1913bb08ead919d2a27de5dbedd867cf6dd824f011a"
  license "MIT"
  head "https://github.com/caopengau/aiready.git", branch: "main"

  depends_on "node" => :recommended

  def install
    # Install npm package globally
    system "npm", "install", "-g", "--prefix=#{prefix}", "@aiready/cli@#{version}"
    
    # Create a wrapper script
    bin.mkpath
    (bin/"aiready").write <<~EOS
      #!/bin/bash
      exec "#{prefix}/bin/aiready" "$@"
    EOS
    
    # Make wrapper executable
    chmod 0755, bin/"aiready"
  end

  test do
    # Test that the CLI is working
    assert_match "AIReady", shell_output("#{bin}/aiready --version")
    
    # Test scan command on itself
    mkdir_p "test-project"
    (testpath/"test-project/test.js").write("function test() { return true; }")
    cd "test-project" do
      system bin/"aiready", "scan", ".", "--tools", "patterns"
    end
  end

  def caveats
    <<~EOS
      AIReady CLI has been installed!

      Quick Start:
        aiready scan .              # Scan current directory
        aiready scan . --score      # Include AI readiness score
        aiready scan . --output json  # Output as JSON

      Documentation:
        https://getaiready.dev/docs

      GitHub:
        https://github.com/caopengau/aiready
    EOS
  end
end
</task_progress>
</write_to_file>