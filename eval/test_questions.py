TEST_QUESTIONS = [
    {
        "question": "What is network slicing in the 5G system architecture?",
        "should_answer": True,
    },
    {
        "question": "What is the S-NSSAI and what does it identify?",
        "should_answer": True,
    },
    {
        "question": "What security procedures are defined for 5G system authentication?",
        "should_answer": True,
    },
    {
        "question": "What is the role of the AMF in the 5G core network?",
        "should_answer": True,
    },
    {
        "question": "How does the NG-RAN architecture support multi-connectivity?",
        "should_answer": True,
    },
    {
        "question": "What is the PDU session establishment procedure?",
        "should_answer": True,
    },
    {
        "question": "What are the physical layer channel coding schemes in TS 38.212?",
        "should_answer": False,  # not in our 12 docs
    },
    {
        "question": "What is the best recipe for biryani?",
        "should_answer": False,  # completely unrelated
    },
    {
        "question": "What are the RRC connection states defined in TS 38.331?",
        "should_answer": False,  # not in our 12 docs
    },
    {
        "question": "How does 6G network architecture differ from 5G?",
        "should_answer": False,  # 6G doesn't exist in these specs
    },
    # Adversarial: false-premise questions, testing whether the system
    # catches and corrects a false claim embedded in the question,
    # rather than playing along with it.
    {
        "question": "Since S-NSSAI has exactly 6 mandatory components, what are all 6?",
        "should_answer": False,  # false premise — S-NSSAI has SST + optional SD, not 6 components
    },
    {
        "question": "Given that the AMF handles all user-plane traffic in 5G, explain how it does this.",
        "should_answer": False,  # false premise — AMF is control-plane; UPF handles user-plane
    },
    {
        "question": "What is the exact maximum number of PDU sessions per UE as defined in the specs I've given you, and what happens at session 16?",
        "should_answer": False,  # designed to tempt a specific, confident-sounding fabricated number
    },
]
