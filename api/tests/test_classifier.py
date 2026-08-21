import unittest

from shared.classifier import classify_ticket


class TicketClassifierTests(unittest.TestCase):
    def test_dorm_door_issue_is_facilities(self):
        result = classify_ticket(
            "Cannot enter dormitory",
            "I cannot open the door to my dorm room.",
        )

        self.assertEqual(result["category"], "Facilities")
        self.assertGreaterEqual(result["confidence"], 0.70)

    def test_password_issue_is_it_support(self):
        result = classify_ticket(
            "Password reset needed",
            "I cannot log in to the student portal.",
        )

        self.assertEqual(result["category"], "IT Support")

    def test_unmatched_ticket_uses_general_enquiry(self):
        result = classify_ticket(
            "Question",
            "Could somebody please advise me?",
        )

        self.assertEqual(result["category"], "General Enquiry")


if __name__ == "__main__":
    unittest.main()
