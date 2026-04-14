def fibonacci(n):
    """
    Calculate the nth Fibonacci number.

    Args:
        n: A non-negative integer

    Returns:
        The nth Fibonacci number

    Raises:
        ValueError: If n is negative
    """
    if n < 0:
        raise ValueError("n must be non-negative")
    if n == 0:
        return 0
    if n == 1:
        return 1

    a, b = 0, 1
    for _ in range(2, n + 1):
        a, b = b, a + b
    return b


if __name__ == "__main__":
    # Test the function
    for i in range(10):
        print(f"fibonacci({i}) = {fibonacci(i)}")
